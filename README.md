# Expense Viewer

Painel de financas pessoais para acompanhar despesas parceladas e pontuais com visualizacoes claras e controle total.

## Funcionalidades

- **Despesas Parceladas** — cadastre compras parceladas com valor total, quantidade de parcelas e mes de inicio. Acompanhe o progresso de pagamento com timeline visual por mes
- **Despesas Pontuais** — registre gastos unicos e marque como pago/pendente de forma independente
- **Edicao Inline** — edite nome, valor, parcelas e mes de inicio diretamente no card da despesa, com redistribuicao automatica no historico
- **Historico Mensal** — visualize todos os gastos organizados por mes, com status pago/pendente e detalhamento por item
- **Grafico de Tendencia** — grafico de barras SVG mostrando a evolucao dos gastos mensais
- **Multiplos Paineis** — crie paineis separados para organizar diferentes categorias de gastos
- **Contas de Usuario** — registro e login com email/senha, cada usuario com seus proprios paineis
- **Compartilhamento** — gere links de leitura protegidos por chave secreta para compartilhar com outras pessoas
- **Bilingue** — interface em Portugues e Ingles, alternavel a qualquer momento

## Tecnologias

- **Next.js 14** — App Router com Server Components e Server Actions
- **React 18** — interface reativa com useTransition para operacoes otimistas
- **Tailwind CSS 3** — estilizacao utilitaria responsiva
- **Supabase** — banco de dados PostgreSQL e API REST
- **Lucide React** — icones SVG
- **Zero dependencias extras** — graficos e visualizacoes feitos com SVG inline e CSS puro

## Configuracao

### 1. Instalar dependencias

```bash
npm install
```

### 2. Configurar variaveis de ambiente

Crie um arquivo `.env.local` na raiz do projeto:

```env
SUPABASE_URL=sua_url_do_supabase
SUPABASE_ANON_KEY=sua_anon_key

SESSION_SECRET=gere_com_openssl_rand_hex_32
SHAREABLE_UUID_KEY=share_seu_uuid_aqui
```

### 3. Criar tabelas no Supabase

Execute os seguintes SQLs no **SQL Editor** do Supabase:

```sql
CREATE TABLE users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE dashboards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  is_default BOOLEAN DEFAULT FALSE,
  user_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE installment_expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  dashboard_id UUID REFERENCES dashboards(id),
  name TEXT NOT NULL,
  total_amount NUMERIC NOT NULL,
  installments INTEGER NOT NULL,
  paid_installments INTEGER DEFAULT 0,
  installment_amount NUMERIC NOT NULL,
  start_month TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE one_time_expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  dashboard_id UUID REFERENCES dashboards(id),
  name TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE monthly_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  dashboard_id UUID REFERENCES dashboards(id),
  month TEXT NOT NULL,
  total_amount NUMERIC DEFAULT 0,
  details JSONB DEFAULT '[]',
  status TEXT DEFAULT 'pending',
  sort_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 4. Executar

```bash
npm run dev
```

Acesse `http://localhost:3000`, crie sua conta e comece a cadastrar suas despesas.

## Estrutura do Projeto

```
src/
├── actions/         # Server Actions (auth, dashboard CRUD)
├── app/             # Paginas Next.js (login, painel principal, compartilhamento)
├── components/      # Componentes React (cards, graficos, timeline, formularios)
├── data/            # Dados de exemplo para desenvolvimento
├── lib/             # Supabase client e utilitarios de senha
└── utils/           # Formatacao de moeda (BRL)
```
