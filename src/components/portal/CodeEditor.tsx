import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Play, CheckCircle2, XCircle, Loader2, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import { useExecuteCode, type TestCase, type TestResult, type ExecutionResult } from '@/hooks/useCodeExecution';

interface CodeEditorProps {
  code: string;
  language: string;
  testCases: TestCase[];
  questionId?: string;
  accessToken?: string;
  onCodeChange: (code: string) => void;
  onExecutionResult?: (result: ExecutionResult) => void;
}

export function CodeEditor({
  code,
  language,
  testCases,
  questionId,
  accessToken,
  onCodeChange,
  onExecutionResult,
}: CodeEditorProps) {
  const [activeTab, setActiveTab] = useState('code');
  const [executionResult, setExecutionResult] = useState<ExecutionResult | null>(null);
  const executeCode = useExecuteCode();

  const handleRun = async () => {
    try {
      const result = await executeCode.mutateAsync({
        code,
        language,
        test_cases: testCases,
        question_id: questionId,
        access_token: accessToken,
      });
      setExecutionResult(result);
      setActiveTab('results');
      onExecutionResult?.(result);
    } catch (error) {
      console.error('Execution error:', error);
    }
  };

  // Filter visible test cases for display
  const visibleTestCases = testCases.filter(tc => !tc.is_hidden);
  const hiddenCount = testCases.length - visibleTestCases.length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="outline">{language}</Badge>
          <span className="text-sm text-muted-foreground">
            {testCases.length} caso{testCases.length !== 1 ? 's' : ''} de teste
            {hiddenCount > 0 && ` (${hiddenCount} oculto${hiddenCount !== 1 ? 's' : ''})`}
          </span>
        </div>
        <Button
          onClick={handleRun}
          disabled={executeCode.isPending || !code.trim()}
          size="sm"
        >
          {executeCode.isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Executando...
            </>
          ) : (
            <>
              <Play className="h-4 w-4 mr-2" />
              Executar Código
            </>
          )}
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="code">Código</TabsTrigger>
          <TabsTrigger value="testcases">
            Casos de Teste
            {visibleTestCases.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {visibleTestCases.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="results">
            Resultados
            {executionResult && (
              <Badge
                variant={executionResult.success ? 'default' : 'destructive'}
                className="ml-2"
              >
                {executionResult.passed_count}/{executionResult.total_count}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="code" className="mt-4">
          <Textarea
            value={code}
            onChange={(e) => onCodeChange(e.target.value)}
            placeholder="Escreva seu código aqui..."
            className="min-h-[350px] font-mono text-sm"
          />
        </TabsContent>

        <TabsContent value="testcases" className="mt-4">
          <ScrollArea className="h-[350px]">
            <div className="space-y-3">
              {visibleTestCases.length === 0 ? (
                <Card>
                  <CardContent className="pt-6 text-center text-muted-foreground">
                    <Eye className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>Todos os casos de teste são ocultos.</p>
                    <p className="text-sm">Execute seu código para verificar se ele passa nos testes!</p>
                  </CardContent>
                </Card>
              ) : (
                visibleTestCases.map((tc, idx) => (
                  <Card key={idx}>
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        Caso de Teste {idx + 1}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="py-2 space-y-2">
                      <div>
                        <span className="text-xs font-medium text-muted-foreground">Entrada:</span>
                        <pre className="mt-1 p-2 bg-muted rounded text-xs overflow-x-auto">
                          {tc.input || '(sem entrada)'}
                        </pre>
                      </div>
                      <div>
                        <span className="text-xs font-medium text-muted-foreground">Saída Esperada:</span>
                        <pre className="mt-1 p-2 bg-muted rounded text-xs overflow-x-auto">
                          {tc.expected_output}
                        </pre>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
              {hiddenCount > 0 && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground p-3 bg-muted/50 rounded-lg">
                  <EyeOff className="h-4 w-4" />
                  {hiddenCount} caso{hiddenCount !== 1 ? 's' : ''} de teste oculto{hiddenCount !== 1 ? 's' : ''} {hiddenCount !== 1 ? 'serão avaliados' : 'será avaliado'}
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="results" className="mt-4">
          <ScrollArea className="h-[350px]">
            {executeCode.isPending ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : executeCode.isError ? (
              <Card className="border-destructive">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
                    <div>
                      <p className="font-medium text-destructive">Erro de Execução</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {executeCode.error?.message || 'Ocorreu um erro ao executar seu código.'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : executionResult ? (
              <div className="space-y-3">
                {/* Summary */}
                <Card className={executionResult.success ? 'border-green-500' : 'border-amber-500'}>
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {executionResult.success ? (
                          <CheckCircle2 className="h-6 w-6 text-green-500" />
                        ) : (
                          <AlertTriangle className="h-6 w-6 text-amber-500" />
                        )}
                        <div>
                          <p className="font-medium">
                            {executionResult.success ? 'Todos os Testes Passaram!' : 'Alguns Testes Falharam'}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {executionResult.passed_count} de {executionResult.total_count} casos de teste passaram
                          </p>
                        </div>
                      </div>
                      <Badge
                        variant={executionResult.success ? 'default' : 'secondary'}
                        className="text-lg px-3 py-1"
                      >
                        {executionResult.score_percentage}%
                      </Badge>
                    </div>
                  </CardContent>
                </Card>

                {/* Individual Results */}
                {executionResult.results.map((result, idx) => (
                  <TestResultCard key={idx} result={result} index={idx} />
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="pt-6 text-center text-muted-foreground">
                  <Play className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Execute seu código para ver os resultados</p>
                </CardContent>
              </Card>
            )}
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface TestResultCardProps {
  result: TestResult;
  index: number;
}

function TestResultCard({ result, index }: TestResultCardProps) {
  return (
    <Card className={result.passed ? 'border-green-200 dark:border-green-900' : 'border-red-200 dark:border-red-900'}>
      <CardHeader className="py-3">
        <CardTitle className="text-sm flex items-center gap-2">
          {result.passed ? (
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          ) : (
            <XCircle className="h-4 w-4 text-red-500" />
          )}
          Caso de Teste {index + 1}
          {result.is_hidden && (
            <Badge variant="outline" className="ml-2">
              <EyeOff className="h-3 w-3 mr-1" />
              Oculto
            </Badge>
          )}
          {result.execution_time !== undefined && (
            <span className="ml-auto text-xs text-muted-foreground">
              {result.execution_time.toFixed(2)}ms
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="py-2 space-y-2">
        {result.error ? (
          <div>
            <span className="text-xs font-medium text-red-500">Erro:</span>
            <pre className="mt-1 p-2 bg-red-50 dark:bg-red-950/30 rounded text-xs overflow-x-auto text-red-700 dark:text-red-300">
              {result.error}
            </pre>
          </div>
        ) : (
          <>
            {!result.is_hidden && (
              <>
                <div>
                  <span className="text-xs font-medium text-muted-foreground">Entrada:</span>
                  <pre className="mt-1 p-2 bg-muted rounded text-xs overflow-x-auto">
                    {result.input || '(sem entrada)'}
                  </pre>
                </div>
                <div>
                  <span className="text-xs font-medium text-muted-foreground">Esperado:</span>
                  <pre className="mt-1 p-2 bg-muted rounded text-xs overflow-x-auto">
                    {result.expected_output}
                  </pre>
                </div>
              </>
            )}
            <div>
              <span className="text-xs font-medium text-muted-foreground">Sua Saída:</span>
              <pre className={`mt-1 p-2 rounded text-xs overflow-x-auto ${
                result.passed 
                  ? 'bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300' 
                  : 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300'
              }`}>
                {result.actual_output || '(sem saída)'}
              </pre>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
