-- Plataforma: observabilidad de sync + datos propios (no ERP)

CREATE TABLE IF NOT EXISTS sync_runs (
  id SERIAL PRIMARY KEY,
  entity VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('running', 'success', 'failed')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  records_processed INT NOT NULL DEFAULT 0,
  records_failed INT NOT NULL DEFAULT 0,
  error_message TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_sync_runs_entity_started
  ON sync_runs (entity, started_at DESC);

CREATE TABLE IF NOT EXISTS sync_entity_state (
  entity VARCHAR(50) PRIMARY KEY,
  last_success_at TIMESTAMPTZ,
  last_run_id INT REFERENCES sync_runs (id),
  records_total INT NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'
);

-- Estado operativo propio de la plataforma (logística, fábrica, mobile, etc.)
CREATE TABLE IF NOT EXISTS platform_pedido_estado (
  division INT NOT NULL,
  tipo VARCHAR(10) NOT NULL,
  numero INT NOT NULL,
  estado_operativo VARCHAR(50) NOT NULL DEFAULT 'pendiente',
  notas TEXT,
  actualizado_por VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (division, tipo, numero)
);

CREATE INDEX IF NOT EXISTS idx_platform_pedido_estado_operativo
  ON platform_pedido_estado (estado_operativo);
