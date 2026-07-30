import { sql } from '../db';

export type SyncEntity =
  | 'productos'
  | 'clientes'
  | 'notas_pedido'
  | 'notas_pedido_detalle';

export type SyncResult = {
  procesados: number;
  errores: number;
};

export type SyncTask = {
  entity: SyncEntity;
  run: () => Promise<SyncResult>;
};

async function createRun(entity: SyncEntity): Promise<number> {
  const rows = await sql`
    INSERT INTO sync_runs (entity, status)
    VALUES (${entity}, 'running')
    RETURNING id
  `;
  return rows[0].id;
}

async function finishRun(
  runId: number,
  entity: SyncEntity,
  status: 'success' | 'failed',
  recordsProcessed: number,
  recordsFailed: number,
  errorMessage?: string
) {
  await sql`
    UPDATE sync_runs
    SET
      status = ${status},
      finished_at = NOW(),
      records_processed = ${recordsProcessed},
      records_failed = ${recordsFailed},
      error_message = ${errorMessage ?? null}
    WHERE id = ${runId}
  `;

  if (status === 'success') {
    await sql`
      INSERT INTO sync_entity_state (entity, last_success_at, last_run_id, records_total)
      VALUES (${entity}, NOW(), ${runId}, ${recordsProcessed})
      ON CONFLICT (entity) DO UPDATE SET
        last_success_at = EXCLUDED.last_success_at,
        last_run_id = EXCLUDED.last_run_id,
        records_total = EXCLUDED.records_total
    `;
  }
}

export async function runSyncTask(task: SyncTask): Promise<SyncResult> {
  const runId = await createRun(task.entity);

  try {
    const result = await task.run();
    const procesados = result.procesados;
    const errores = result.errores;

    await finishRun(
      runId,
      task.entity,
      errores > 0 && procesados === 0 ? 'failed' : 'success',
      procesados,
      errores
    );

    return { procesados, errores };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await finishRun(runId, task.entity, 'failed', 0, 0, message);
    throw error;
  }
}

export async function runFullSync(tasks: SyncTask[]) {
  const summary: Record<string, SyncResult> = {};

  for (const task of tasks) {
    console.log(`\n━━━ Sync: ${task.entity} ━━━`);
    summary[task.entity] = await runSyncTask(task);
  }

  return summary;
}

export async function getSyncStatus() {
  const entities = await sql`
    SELECT
      s.entity,
      s.last_success_at,
      s.records_total,
      r.status AS last_status,
      r.started_at AS last_started_at,
      r.finished_at AS last_finished_at,
      r.records_processed AS last_records_processed,
      r.records_failed AS last_records_failed,
      r.error_message AS last_error_message
    FROM sync_entity_state s
    LEFT JOIN sync_runs r ON r.id = s.last_run_id
    ORDER BY s.entity
  `;

  const recentRuns = await sql`
    SELECT entity, status, started_at, finished_at, records_processed, records_failed
    FROM sync_runs
    ORDER BY started_at DESC
    LIMIT 20
  `;

  return { entities, recentRuns };
}
