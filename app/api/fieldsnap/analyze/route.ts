import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { analyzePhoto, analyzeDefectSeverity } from '@/lib/ai-analysis'
import { rateLimit, addRateLimitHeaders, handleApiError } from '@/lib/api/auth-middleware'
import { updateMediaAsset } from '@/lib/supabase/fieldsnap'
import { punchListService, type AIFindingType, type PunchListSeverity } from '@/lib/punchlist'
import { createTaskFromPunchItem, shouldAutoCreateTask } from '@/lib/punchlist-taskflow-integration'

/**
 * Create punch list items from AI analysis findings
 * Only creates items for high-confidence findings (>0.7) with significant severity
 */
async function createPunchListFromAnalysis(
  analysis: any,
  photoId: string,
  projectId: string
): Promise<{ created: number; items: any[] }> {
  const createdItems: any[] = []

  try {
    // Process defects
    if (analysis.defects && analysis.defects.length > 0) {
      for (const defect of analysis.defects) {
        // Analyze defect severity
        const severityAnalysis = analyzeDefectSeverity(defect)

        // Only create punch items for medium+ severity
        if (severityAnalysis.severity !== 'low') {
          const finding = {
            type: defect.split(':')[0].trim() || 'Quality Defect',
            description: defect,
            severity: severityAnalysis.severity,
            confidence: analysis.confidence || 0.8,
            location: 'Detected in photo analysis'
          }

          const punchItem = await punchListService.createFromAIFinding(
            finding,
            { id: photoId, project_id: projectId },
            'quality_defect' as AIFindingType
          )

          if (punchItem) {
            createdItems.push(punchItem)
          }
        }
      }
    }

    // Process safety issues (ALWAYS create punch items for safety)
    if (analysis.safety_issues && analysis.safety_issues.length > 0) {
      for (const safetyIssue of analysis.safety_issues) {
        // All safety issues are at least HIGH severity
        const severityAnalysis = analyzeDefectSeverity(safetyIssue)
        const severity = severityAnalysis.severity === 'low' ? 'high' : severityAnalysis.severity

        const finding = {
          type: safetyIssue.split(':')[0].trim() || 'Safety Concern',
          description: safetyIssue,
          severity: severity,
          confidence: analysis.confidence || 0.85,
          location: 'Detected in photo analysis'
        }

        const punchItem = await punchListService.createFromAIFinding(
          finding,
          { id: photoId, project_id: projectId },
          'safety_issue' as AIFindingType
        )

        if (punchItem) {
          createdItems.push(punchItem)
        }
      }
    }

    // If quality score is very low (<60), create a general quality concern
    if (analysis.quality_score && analysis.quality_score < 60) {
      const finding = {
        type: 'Overall Quality Concern',
        description: `Quality score is below acceptable threshold (${analysis.quality_score}/100). This area requires immediate inspection and potential rework.`,
        severity: 'medium' as const,
        confidence: analysis.confidence || 0.75,
        location: 'Overall photo assessment'
      }

      const punchItem = await punchListService.createFromAIFinding(
        finding,
        { id: photoId, project_id: projectId },
        'quality_defect' as AIFindingType
      )

      if (punchItem) {
        createdItems.push(punchItem)
      }
    }

    // Auto-create TaskFlow tasks for critical/high severity items
    let tasksCreated = 0
    for (const punchItem of createdItems) {
      if (shouldAutoCreateTask(punchItem)) {
        try {
          const taskResult = await createTaskFromPunchItem(punchItem)
          if (taskResult.success && taskResult.taskId) {
            // Update punch item with task reference
            await punchListService.update(punchItem.id, {
              task_id: taskResult.taskId
            })
            tasksCreated++
            console.log(`✓ Created TaskFlow task ${taskResult.taskId} for punch item ${punchItem.id}`)
          }
        } catch (err) {
          console.error(`Failed to create task for punch item ${punchItem.id}:`, err)
        }
      }
    }

    if (tasksCreated > 0) {
      console.log(`🎯 Created ${tasksCreated} TaskFlow task(s) from critical punch items`)
    }

    return {
      created: createdItems.length,
      items: createdItems,
      tasksCreated
    }
  } catch (error) {
    console.error('Error creating punch list items from analysis:', error)
    return {
      created: 0,
      items: [],
      tasksCreated: 0
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Rate limiting (5 AI analyses per minute - heavy operation)
    const rateLimitError = rateLimit(request, `analyze-${user.id}`, 5, 60000)
    if (rateLimitError) return rateLimitError

    const { mediaAssetId, imageUrl, analysisType = 'construction_specific' } = await request.json()

    if (!mediaAssetId || !imageUrl) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Verify the media asset belongs to the user
    const { data: asset, error: assetError } = await supabase
      .from('media_assets')
      .select('*')
      .eq('id', mediaAssetId)
      .eq('user_id', user.id)
      .single()

    if (assetError || !asset) {
      return NextResponse.json({ error: 'Media asset not found' }, { status: 404 })
    }

    // Perform AI analysis
    const analysis = await analyzePhoto(imageUrl, {
      type: analysisType,
      focusAreas: ['objects', 'defects', 'safety', 'quality'],
      saveToHistory: true
    })

    // Update the media asset with analysis results
    const updated = await updateMediaAsset(mediaAssetId, {
      ai_analysis: {
        objects: analysis.objects,
        defects: analysis.defects,
        safety_issues: analysis.safety_issues,
        quality_score: analysis.quality_score,
        confidence: analysis.confidence
      },
      ai_tags: [
        ...analysis.objects.slice(0, 5),
        ...(analysis.defects.length > 0 ? ['defect-detected'] : []),
        ...(analysis.safety_issues.length > 0 ? ['safety-concern'] : [])
      ],
      ai_processed_at: new Date().toISOString()
    })

    if (!updated) {
      return NextResponse.json({ error: 'Failed to update media asset' }, { status: 500 })
    }

    // Save to analysis history table if it exists
    try {
      await supabase.from('ai_analysis_history').insert({
        user_id: user.id,
        media_asset_id: mediaAssetId,
        analysis_type: analysis.analysis_type,
        model_version: analysis.model_version,
        processing_time_ms: analysis.processing_time_ms,
        result: analysis,
        created_at: new Date().toISOString()
      })
    } catch (err) {
      // Table might not exist yet, log but don't fail
      console.log('Analysis history table not available:', err)
    }

    // Create punch list items from findings (if project_id exists)
    let punchListResult = { created: 0, items: [] }
    if (asset.project_id) {
      try {
        punchListResult = await createPunchListFromAnalysis(
          analysis,
          mediaAssetId,
          asset.project_id
        )

        console.log(`Created ${punchListResult.created} punch list items from AI findings`)
      } catch (err) {
        // Don't fail the entire request if punch list creation fails
        console.error('Error creating punch list items:', err)
      }
    }

    const response = NextResponse.json({
      success: true,
      analysis,
      mediaAssetId,
      punchList: {
        created: punchListResult.created,
        tasksCreated: punchListResult.tasksCreated || 0,
        items: punchListResult.items.map(item => ({
          id: item.id,
          title: item.title,
          severity: item.severity,
          category: item.category,
          status: item.status,
          hasTask: !!item.task_id
        }))
      }
    })

    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser()

    if (currentUser) {
      return addRateLimitHeaders(response, `analyze-${currentUser.id}`, 5)
    }
    return response
  } catch (error) {
    return handleApiError(error)
  }
}

// Batch analysis endpoint
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Rate limiting (2 batch analyses per minute - very heavy operation)
    const rateLimitError = rateLimit(request, `batch-analyze-${user.id}`, 2, 60000)
    if (rateLimitError) return rateLimitError

    const { mediaAssetIds, analysisType = 'construction_specific' } = await request.json()

    if (!mediaAssetIds || !Array.isArray(mediaAssetIds) || mediaAssetIds.length === 0) {
      return NextResponse.json({ error: 'Invalid media asset IDs' }, { status: 400 })
    }

    // Get all media assets
    const { data: assets, error: assetsError } = await supabase
      .from('media_assets')
      .select('*')
      .in('id', mediaAssetIds)
      .eq('user_id', user.id)

    if (assetsError || !assets || assets.length === 0) {
      return NextResponse.json({ error: 'No media assets found' }, { status: 404 })
    }

    // Process each asset
    const results = await Promise.allSettled(
      assets.map(async (asset) => {
        const analysis = await analyzePhoto(asset.url, {
          type: analysisType,
          focusAreas: ['objects', 'defects', 'safety', 'quality'],
          saveToHistory: true
        })

        await updateMediaAsset(asset.id, {
          ai_analysis: {
            objects: analysis.objects,
            defects: analysis.defects,
            safety_issues: analysis.safety_issues,
            quality_score: analysis.quality_score,
            confidence: analysis.confidence
          },
          ai_tags: [
            ...analysis.objects.slice(0, 5),
            ...(analysis.defects.length > 0 ? ['defect-detected'] : []),
            ...(analysis.safety_issues.length > 0 ? ['safety-concern'] : [])
          ],
          ai_processed_at: new Date().toISOString()
        })

        // Create punch list items from findings (if project_id exists)
        let punchListResult = { created: 0, items: [] }
        if (asset.project_id) {
          try {
            punchListResult = await createPunchListFromAnalysis(
              analysis,
              asset.id,
              asset.project_id
            )
          } catch (err) {
            console.error(`Error creating punch list for asset ${asset.id}:`, err)
          }
        }

        return {
          mediaAssetId: asset.id,
          analysis,
          punchListCreated: punchListResult.created
        }
      })
    )

    const successful = results.filter(r => r.status === 'fulfilled').length
    const failed = results.filter(r => r.status === 'rejected').length
    const totalPunchItemsCreated = results
      .filter(r => r.status === 'fulfilled')
      .reduce((sum, r: any) => sum + (r.value?.punchListCreated || 0), 0)

    const response = NextResponse.json({
      success: true,
      total: mediaAssetIds.length,
      successful,
      failed,
      punchListItemsCreated: totalPunchItemsCreated,
      results: results.map(r => r.status === 'fulfilled' ? r.value : null).filter(Boolean)
    })

    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser()

    if (currentUser) {
      return addRateLimitHeaders(response, `batch-analyze-${currentUser.id}`, 2)
    }
    return response
  } catch (error) {
    return handleApiError(error)
  }
}
