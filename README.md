# Money Tracker (Expense Viewer)

App web de financas pessoais para acompanhar **todos os seus gastos**: transacoes do dia a dia, receitas, orcamentos por categoria e — na aba **Parcelas** — o Expense Viewer original com todos os seus dados de parcelamentos.

## Abas

| Aba | Rota | O que faz |
|---|---|---|
| **Visao Geral** | `/` | Entradas, saidas, guardar e sobra prevista; fluxo do mes dia a dia com saldo; renda x faturas (quanto sobra do salario/adiantamento depois do cartao); despesas fixas pagas/pendentes; faturas dos cartoes; gastos maiores x menores com os maiores gastos; grafico de 6 meses; gastos por categoria; orcamentos |
| **Transacoes** | `/transactions` | Registre gastos e receitas (valor, data, descricao, categoria, conta/cartao, forma de pagamento, observacoes). Busca, filtros por conta, maior/menor, categoria e tipo; edicao; exportacao CSV |
| **Fixas** | `/recurring` | Receitas fixas (salario, adiantamento) e despesas que se repetem todo mes (aluguel, internet, assinaturas). Status recebido/previsto e pago/pendente/atrasado; "Marcar pago/recebido" registra a transacao com o valor real do mes |
| **Cartoes e Contas** | `/accounts` | Cartoes com dia de fechamento, vencimento, limite e "pago com" (qual receita paga a fatura). Cada fatura fica no **mes em que vence**; voce pode informar o valor total da fatura (do app do banco) e marcar como paga. Contas bancarias e dinheiro com entradas/saidas |
| **Guardar** | `/savings` | Plano para guardar dinheiro: renda prevista, comprometido, livre no mes, sugestao (20% da renda, limitado ao que sobra), reserva de emergencia (6x custo de vida) e metas com progresso, valor por mes e prazo |
| **Orcamentos** | `/budgets` | Limite mensal por categoria; gerenciar categorias |
| **Parcelas** | `/installments` | O Expense Viewer original, sem alteracoes de dados (paineis, parcelados, pontuais, historico, PIX, compartilhamento) + botao **Baixar backup** (JSON com todos os dados das parcelas) |

Gasto "maior" = a partir de um valor que voce define na Visao Geral (padrao R$ 300).

Todas as abas tem seletor de mes (`?month=AAAA-MM`). A fatura de parcelas de cada mes (vinda da aba Parcelas, ja descontando pagamentos PIX) entra no saldo da Visao Geral. Links antigos `/?dashboardId=...` redirecionam para `/installments?dashboardId=...`; links de compartilhamento continuam iguais.

### Migracao (obrigatoria uma vez)

As novas abas usam tabelas novas (`categories`, `accounts`, `recurring_expenses`, `transactions`, `budgets`, `finance_settings`, `card_bills`, `savings_goals`, `savings_entries`). Instalacao nova: rode o `001`. Se voce ja rodou o `001` e o `002`, rode apenas o `003_cards_income_savings.sql`. Execute `supabase/migrations/001_spending_tracker.sql` no SQL Editor do Supabase. As tabelas existentes nao sao alteradas. Enquanto a migracao nao for executada, as novas abas mostram um aviso e a aba Parcelas continua funcionando normalmente. Na primeira visita, categorias padrao sao criadas automaticamente.

## Funcionalidades da aba Parcelas

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

Depois execute tambem `supabase/migrations/001_spending_tracker.sql` (tabelas das abas Visao Geral, Transacoes e Orcamentos).

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
