import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getTemplateById } from '@/lib/task-templates'

export async function POST(request: NextRequest) {
  try {
    const { templateId, projectId } = await request.json()

    if (!templateId || !projectId) {
      return NextResponse.json(
        { error: 'templateId and projectId are required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const template = getTemplateById(templateId)
    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    // Build the tasks array from template items
    const tasksToCreate = template.tasks.map((item, index) => ({
      user_id: user.id,
      project_id: projectId,
      title: item.title,
      description: item.description || null,
      priority: item.priority || 'medium',
      status: 'not-started',
      estimated_hours: item.estimated_hours || null,
      // Convert dependency indices to a placeholder — real IDs resolved after insert
      dependencies: [], // populated in second pass below
      sequence_order: index,
      created_at: new Date().toISOString(),
    }))

    const { data: created, error: insertError } = await supabase
      .from('tasks')
      .insert(tasksToCreate)
      .select('id')

    if (insertError) throw insertError

    // Second pass: wire up dependencies by index now that we have real IDs
    const createdIds = (created || []).map((r: { id: string }) => r.id)
    const depUpdates: PromiseLike<any>[] = []

    template.tasks.forEach((item, index) => {
      if (item.dependencies && item.dependencies.length > 0) {
        const depIds = item.dependencies
          .filter(depIdx => depIdx < createdIds.length)
          .map(depIdx => createdIds[depIdx])

        if (depIds.length > 0) {
          depUpdates.push(
            supabase
              .from('tasks')
              .update({ dependencies: depIds })
              .eq('id', createdIds[index])
              .then()
          )
        }
      }
    })

    await Promise.allSettled(depUpdates)

    return NextResponse.json({
      success: true,
      tasksCreated: createdIds.length,
      templateName: template.name,
      taskIds: createdIds,
    })
  } catch (error: any) {
    console.error('Apply template error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
