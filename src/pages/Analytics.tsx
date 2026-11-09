import { Footer } from '@/components/Footer';
import { usePageTitle } from '@/hooks/usePageTitle';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Users, 
  ClipboardList, 
  CheckCircle2, 
  TrendingUp,
  Target,
  BarChart3
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { useAnalytics } from '@/hooks/useAnalytics';
import { Skeleton } from '@/components/ui/skeleton';

function StatCard({ 
  title, 
  value, 
  description, 
  icon: Icon,
  trend,
}: { 
  title: string; 
  value: string | number; 
  description: string;
  icon: React.ElementType;
  trend?: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground mt-1">
          {description}
          {trend && <span className="text-green-600 ml-1">{trend}</span>}
        </p>
      </CardContent>
    </Card>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16 mb-2" />
              <Skeleton className="h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[300px] w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[300px] w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function Analytics() {
  usePageTitle('Métricas & Análises');
  const { data: analytics, isLoading } = useAnalytics();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Métricas & Análises</h1>
          <p className="text-muted-foreground">Acompanhe o desempenho das avaliações e as métricas dos candidatos</p>
        </div>

        {isLoading || !analytics ? (
          <LoadingSkeleton />
        ) : (
          <div className="space-y-8">
            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                title="Total de Candidatos"
                value={analytics.totalCandidates}
                description="Candidatos cadastrados"
                icon={Users}
              />
              <StatCard
                title="Avaliações Criadas"
                value={analytics.totalAssessments}
                description="Avaliações ativas"
                icon={ClipboardList}
              />
              <StatCard
                title="Testes Concluídos"
                value={analytics.completedAssessments}
                description="Avaliações enviadas"
                icon={CheckCircle2}
              />
              <StatCard
                title="Taxa de Aprovação"
                value={`${analytics.passRate}%`}
                description="Taxa geral de sucesso"
                icon={Target}
              />
            </div>

            {/* Charts Row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Monthly Trends */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Tendências Mensais
                  </CardTitle>
                  <CardDescription>Conclusões de avaliações nos últimos 6 meses</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={analytics.monthlyTrends}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis 
                        dataKey="month" 
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                      />
                      <YAxis 
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                      />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="completed" 
                        stroke="hsl(var(--primary))" 
                        strokeWidth={2}
                        dot={{ fill: 'hsl(var(--primary))' }}
                        name="Concluídas"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="passed" 
                        stroke="hsl(var(--chart-4))" 
                        strokeWidth={2}
                        dot={{ fill: 'hsl(var(--chart-4))' }}
                        name="Aprovadas"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="failed" 
                        stroke="hsl(var(--destructive))" 
                        strokeWidth={2}
                        dot={{ fill: 'hsl(var(--destructive))' }}
                        name="Reprovadas"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Status Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Status das Avaliações
                  </CardTitle>
                  <CardDescription>Distribuição dos status das avaliações dos candidatos</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={analytics.statusDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="count"
                        nameKey="status"
                        label={({ status, count }) => `${status}: ${count}`}
                        labelLine={false}
                      >
                        {analytics.statusDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Charts Row 2 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Score Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Distribuição de Notas</CardTitle>
                  <CardDescription>Como os candidatos pontuaram em todas as avaliações</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={analytics.scoreDistribution}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis 
                        dataKey="range" 
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                      />
                      <YAxis 
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                      />
                      <Bar 
                        dataKey="count" 
                        fill="hsl(var(--primary))" 
                        radius={[4, 4, 0, 0]}
                        name="Candidatos"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Assessment Performance */}
              <Card>
                <CardHeader>
                  <CardTitle>Desempenho por Avaliação</CardTitle>
                  <CardDescription>Taxa de aprovação e nota média por avaliação</CardDescription>
                </CardHeader>
                <CardContent>
                  {analytics.assessmentPerformance.length === 0 ? (
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                      Nenhum dado de avaliação ainda
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={analytics.assessmentPerformance} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis 
                          type="number"
                          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                          domain={[0, 100]}
                        />
                        <YAxis 
                          type="category"
                          dataKey="name"
                          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                          width={100}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                          }}
                        />
                        <Legend />
                        <Bar 
                          dataKey="passRate" 
                          fill="hsl(var(--chart-4))" 
                          radius={[0, 4, 4, 0]}
                          name="Taxa de Aprovação (%)"
                        />
                        <Bar 
                          dataKey="avgScore" 
                          fill="hsl(var(--primary))" 
                          radius={[0, 4, 4, 0]}
                          name="Nota Média (%)"
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Average Score Card */}
            <Card>
              <CardHeader>
                <CardTitle>Resumo de Desempenho</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-around py-4">
                  <div className="text-center">
                    <div className="text-4xl font-bold text-primary">{analytics.averageScore}%</div>
                    <p className="text-sm text-muted-foreground mt-1">Nota Média</p>
                  </div>
                  <div className="h-16 w-px bg-border" />
                  <div className="text-center">
                    <div className="text-4xl font-bold text-green-600">{analytics.passRate}%</div>
                    <p className="text-sm text-muted-foreground mt-1">Taxa de Aprovação</p>
                  </div>
                  <div className="h-16 w-px bg-border" />
                  <div className="text-center">
                    <div className="text-4xl font-bold">{analytics.completedAssessments}</div>
                    <p className="text-sm text-muted-foreground mt-1">Total de Conclusões</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
