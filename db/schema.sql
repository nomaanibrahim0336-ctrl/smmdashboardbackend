-- SMM-MANAGER Database Schema

-- Users / Team
CREATE TABLE IF NOT EXISTS users (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,
  email       VARCHAR(150) UNIQUE NOT NULL,
  password    VARCHAR(255) NOT NULL,
  role        VARCHAR(30) NOT NULL CHECK (role IN ('admin','project_manager','creator','designer')),
  avatar      VARCHAR(10) DEFAULT '👤',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Clients
CREATE TABLE IF NOT EXISTS clients (
  id          VARCHAR(36) PRIMARY KEY,
  name        VARCHAR(150) NOT NULL,
  platform    VARCHAR(50),
  status      VARCHAR(30) DEFAULT 'active',
  package     VARCHAR(50),
  budget      INTEGER DEFAULT 0,
  start_date  DATE,
  end_date    DATE,
  tenure      INTEGER DEFAULT 3,
  brief       TEXT,
  executive   VARCHAR(100),
  designer    VARCHAR(100),
  pm          VARCHAR(100),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Tasks
CREATE TABLE IF NOT EXISTS tasks (
  id            VARCHAR(36) PRIMARY KEY,
  client_id     VARCHAR(36) REFERENCES clients(id) ON DELETE CASCADE,
  client_name   VARCHAR(150),
  title         VARCHAR(255) NOT NULL,
  platform      VARCHAR(50),
  content_type  VARCHAR(50),
  status        VARCHAR(30) DEFAULT 'pending',
  priority      VARCHAR(20) DEFAULT 'medium',
  assigned_to   VARCHAR(100),
  designer      VARCHAR(100),
  created_by    VARCHAR(100),
  due_date      DATE,
  posted_date    DATE,
  scheduled_till DATE,
  brief         TEXT,
  changes_requested BOOLEAN DEFAULT FALSE,
  change_note   TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Task timeline events
CREATE TABLE IF NOT EXISTS task_timeline (
  id          SERIAL PRIMARY KEY,
  task_id     VARCHAR(36) REFERENCES tasks(id) ON DELETE CASCADE,
  action      TEXT NOT NULL,
  by          VARCHAR(100),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Change request comments
CREATE TABLE IF NOT EXISTS change_requests (
  id          SERIAL PRIMARY KEY,
  task_id     VARCHAR(36) REFERENCES tasks(id) ON DELETE CASCADE,
  note        TEXT NOT NULL,
  requested_by VARCHAR(100),
  resolved    BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tasks_client ON tasks(client_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_timeline_task ON task_timeline(task_id);
CREATE INDEX IF NOT EXISTS idx_changes_task ON change_requests(task_id);

-- Seed admin user (password: admin123)
INSERT INTO users (name, email, password, role, avatar)
VALUES ('Admin', 'admin@smm.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin', '🛡️')
ON CONFLICT (email) DO NOTHING;

-- Seed team members
INSERT INTO users (name, email, password, role, avatar) VALUES
  ('Noman',  'noman@smm.com', '$2a$10$YyN7u5MqWtHq6gSZFm5JrOxu3UH4p5ZyVnpCfVgKpEJ5XhCCPMNPi', 'project_manager', '👑'),
  ('Zaid',   'zaid@smm.com',  '$2a$10$YyN7u5MqWtHq6gSZFm5JrOxu3UH4p5ZyVnpCfVgKpEJ5XhCCPMNPi', 'creator',          '✍️'),
  ('Faaiz',  'faaiz@smm.com', '$2a$10$YyN7u5MqWtHq6gSZFm5JrOxu3UH4p5ZyVnpCfVgKpEJ5XhCCPMNPi', 'designer',         '🎨')
ON CONFLICT (email) DO NOTHING;
