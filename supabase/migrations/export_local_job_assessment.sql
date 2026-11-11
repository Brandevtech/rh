-- Migração / Cópia de Dados: Vaga e Teste do Banco Local para o Remoto
-- Vaga: Atendente de Vendas (Operações)
-- Teste: VENDAS (10 questões de múltipla escolha com gabarito)

DO $$
DECLARE
  v_admin_id uuid;
BEGIN
  -- Busca o ID do seu usuário administrador
  SELECT id INTO v_admin_id 
  FROM auth.users 
  WHERE email = 'andersonografia@gmail.com' 
  LIMIT 1;

  -- 1. Inserir a Avaliação (Assessment)
  INSERT INTO public.assessments (
    id, title, description, created_by, duration_minutes, passing_score, status, settings, source_job_id, ai_generated
  ) VALUES (
    'e3b971d8-4da2-428c-a382-c3180c8bf818',
    'VENDAS',
    'Teste de habilidade para trabalho com vendas',
    v_admin_id,
    20,
    60,
    'active',
    '{"allow_review": false, "randomize_questions": false, "show_score_immediately": false}'::jsonb,
    NULL,
    false
  ) ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    status = EXCLUDED.status,
    passing_score = EXCLUDED.passing_score,
    duration_minutes = EXCLUDED.duration_minutes;

  -- 2. Inserir a Seção do Teste
  INSERT INTO public.assessment_sections (
    id, assessment_id, title, description, order_index, weightage, skill_tags
  ) VALUES (
    '2e61f18b-aca7-48ad-b9b5-67b67b3bd812',
    'e3b971d8-4da2-428c-a382-c3180c8bf818',
    'Avaliação de Perfil Profissional e Agilidade',
    'Bem-vindo(a) à nossa etapa de avaliação! Este formulário possui um limite rigoroso de 20 minutos para ser concluído. Buscamos profissionais ágeis, com forte espírito de equipe e proatividade diante dos desafios do chão de loja.',
    0,
    100,
    '[]'::jsonb
  ) ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description;

  -- 3. Inserir as 10 Questões do Teste
  INSERT INTO public.questions (id, section_id, type, question_text, options, correct_answer, marks, order_index)
  VALUES
    (
      '16f0d77b-ec67-499d-971b-5f89311b4212',
      '2e61f18b-aca7-48ad-b9b5-67b67b3bd812',
      'mcq',
      'A loja está com um movimento muito acima do normal em um sábado à tarde, as araras estão desorganizadas e há uma longa fila nos provadores e no caixa. Qual deve ser a sua primeira atitude imediata?',
      '[{"id": "1", "text": "Aguardar o meu supervisor direcionar exatamente o que eu devo fazer para não cometer erros.", "is_correct": false}, {"id": "2", "text": "Focar exclusivamente no meu atendimento individual de vendas para garantir a minha meta de comissão do dia.", "is_correct": false}, {"id": "3", "text": "Identificar a prioridade mais crítica no momento (como organizar a fila dos provadores ou repor peças essenciais) e agir rapidamente para desafogar o fluxo, avisando a equipe", "is_correct": true}, {"id": "4", "text": "Organizar primeiro o meu setor de atendimento e deixar os demais setores para os colegas de equipe.", "is_correct": false}]'::jsonb,
      '["3"]'::jsonb, 1, 0
    ),
    (
      'd8e189bc-3729-4b12-a84a-77eac5e5b8e4',
      '2e61f18b-aca7-48ad-b9b5-67b67b3bd812',
      'mcq',
      'Um colega do setor de calçados está sobrecarregado com vários clientes ao mesmo tempo, enquanto o seu setor (moda feminina) está com movimento calmo. Como você age?',
      '[{"id": "1", "text": "Permaneço no meu setor, pois cada vendedor deve manter o foco e cuidar da sua própria meta.", "is_correct": false}, {"id": "2", "text": "Me aproximo do setor de calçados para auxiliar no atendimento ou na busca de numerações no estoque, garantindo que nenhum cliente fique sem suporte.", "is_correct": true}, {"id": "3", "text": "Aviso o gerente que o colega precisa de ajuda para que a liderança tome uma providência.", "is_correct": false}, {"id": "4", "text": "Aproveito o tempo ocioso para descansar ou organizar itens secundários do meu setor.", "is_correct": false}]'::jsonb,
      '["2"]'::jsonb, 1, 1
    ),
    (
      '95a80117-c816-4ca7-8ec7-c0a44a1cfd8d',
      '2e61f18b-aca7-48ad-b9b5-67b67b3bd812',
      'mcq',
      'Você percebe que um determinado modelo de calça jeans do lançamento atual está saindo muito rapidamente e o manequim principal da vitrine continua vestindo uma peça antiga e sem estoque. Qual é a sua atitude?',
      '[{"id": "1", "text": "Comunico imediatamente o responsável pelo Visual Merchandising (VM) ou a liderança e sugiro a troca rápida da peça para impulsionar ainda mais o produto do momento.", "is_correct": true}, {"id": "2", "text": "Não intervenho, pois a decoração da vitrine é responsabilidade exclusiva de outro departamento.", "is_correct": false}, {"id": "3", "text": "Espero o manequim ser desmontado no fim da semana pelo cronograma padrão.", "is_correct": false}, {"id": "4", "text": "Troco a roupa do manequim por conta própria sem avisar ninguém na loja.", "is_correct": false}]'::jsonb,
      '["1"]'::jsonb, 1, 2
    ),
    (
      'e6363ac9-2092-43c2-869b-e299731f421f',
      '2e61f18b-aca7-48ad-b9b5-67b67b3bd812',
      'mcq',
      'Um cliente está indeciso no caixa sobre levar duas peças de roupa porque o valor total ultrapassou o seu orçamento inicial. Como você reage para fechar a venda e oferecer a melhor experiência?',
      '[{"id": "1", "text": "Pressiono o cliente insistindo que ele deve levar as duas peças porque a oportunidade vai passar.", "is_correct": false}, {"id": "2", "text": "Apresento alternativas de pagamento (como parcelamento no Cartão Riachuelo) e mostro com empatia qual peça tem maior versatilidade no guarda-roupa dele, respeitando sua decisão final.", "is_correct": true}, {"id": "3", "text": "Retiro imediatamente as duas peças da sacola e cancelo a compra sem oferecer alternativas.", "is_correct": false}, {"id": "4", "text": "Fico em silêncio esperando o cliente se decidir sozinho para não ser invasiva(o).", "is_correct": false}]'::jsonb,
      '["2"]'::jsonb, 1, 3
    ),
    (
      '1a27c915-161f-4756-a531-6c9efb09e748',
      '2e61f18b-aca7-48ad-b9b5-67b67b3bd812',
      'mcq',
      'Faltando poucos minutos para o encerramento do expediente, dois clientes entram na loja procurando rapidamente por um look completo para um evento que acontecerá no dia seguinte. O caixa já está fechando o movimento. O que você faz?',
      '[{"id": "1", "text": "Aviso que a loja já está fechando e oriento que retornem amanhã no horário comercial.", "is_correct": false}, {"id": "2", "text": "Acolho os clientes com presteza e entusiasmo, entendo rapidamente a necessidade e alinho com a equipe do caixa a finalização ágil da compra para garantir o look a tempo.", "is_correct": true}, {"id": "3", "text": "Atendo de forma apressada e demonstrando impaciência para que eles saiam logo da loja.", "is_correct": false}, {"id": "4", "text": "Deixo os clientes circularem sozinhos sem oferecer ajuda até que o segurança peça para saírem.", "is_correct": false}]'::jsonb,
      '["2"]'::jsonb, 1, 4
    ),
    (
      '48a52dc2-46cd-48d2-a045-39b1efa053be',
      '2e61f18b-aca7-48ad-b9b5-67b67b3bd812',
      'mcq',
      'Uma vendedora da Riachuelo tinha a meta de vender R$ 5.000,00 em um dia de pico. Até às 15h, ela havia alcançado 60% dessa meta. Nas horas seguintes, conseguiu realizar mais vendas totalizando R$ 1.500,00. Ao final do dia, qual foi o percentual da meta inicial que ela atingiu?',
      '[{"id": "1", "text": "80%", "is_correct": false}, {"id": "2", "text": "90%", "is_correct": false}, {"id": "3", "text": "100%", "is_correct": true}, {"id": "4", "text": "110%", "is_correct": false}]'::jsonb,
      '["3"]'::jsonb, 1, 5
    ),
    (
      '1b7b37b4-0950-4d01-a115-15ce76f992c5',
      '2e61f18b-aca7-48ad-b9b5-67b67b3bd812',
      'mcq',
      'Em uma promoção relâmpago de blusas, a loja oferece um desconto de 20% na segunda peça de menor valor. Um cliente comprou duas blusas: a primeira custava R$ 100,00 e a segunda custava R$ 50,00. Qual foi o valor total pago pelas duas peças após o desconto?',
      '[{"id": "1", "text": "R$ 130,00", "is_correct": true}, {"id": "2", "text": "R$ 135,00", "is_correct": false}, {"id": "3", "text": "R$ 140,00", "is_correct": false}, {"id": "4", "text": "R$ 150,00", "is_correct": false}]'::jsonb,
      '["1"]'::jsonb, 1, 6
    ),
    (
      'a656494b-f15c-467b-b220-319ab38b9627',
      '2e61f18b-aca7-48ad-b9b5-67b67b3bd812',
      'mcq',
      'Um cliente entra na loja visivelmente irritado porque o produto que comprou apresentou um pequeno defeito de fabricação e ele precisa de uma troca urgente para uma viagem. Ele eleva o tom de voz reclamando do atendimento. Qual é a postura mais adequada e resiliente da vendedora?',
      '[{"id": "1", "text": "Responder no mesmo tom de voz para impor limites e mostrar que a culpa não foi sua.", "is_correct": false}, {"id": "2", "text": "Manter a calma, ouvir com atenção e empatia, validar a frustração dele e resolver o problema com agilidade e cordialidade dentro das normas da empresa.", "is_correct": true}, {"id": "3", "text": "Ignorar os reclames e chamar imediatamente o segurança da loja para retirá-lo do balcão.", "is_correct": false}, {"id": "4", "text": "Dizer que a política de troca impede qualquer exceção e mandar o cliente procurar o fabricante.", "is_correct": false}]'::jsonb,
      '["2"]'::jsonb, 1, 7
    ),
    (
      '58c8262e-12ae-4df1-99bf-4083963c605d',
      '2e61f18b-aca7-48ad-b9b5-67b67b3bd812',
      'mcq',
      'Um cliente idoso entra na seção de alfaiataria parecendo confuso, demorando bastante para entender as opções de tamanhos e cortes, e fazendo várias perguntas repetidas sobre o mesmo tecido. Como você deve conduzir o atendimento?',
      '[{"id": "1", "text": "Responder de forma monossilábica e apressada para tentar despachá-lo logo e atender clientes mais ágeis.", "is_correct": false}, {"id": "2", "text": "Afastar-se sutilmente e deixar o cliente sozinho até que ele decida se quer chamar alguém.", "is_correct": false}, {"id": "3", "text": "Sugerir educadamente que ele volte em outro horário acompanhado por um familiar mais jovem que compreenda melhor as instruções.", "is_correct": false}, {"id": "4", "text": "Demonstrar total paciência, usar um tom de voz acolhedor, explicar com clareza e com um sorriso no rosto quantas vezes forem necessárias, garantindo que ele se sinta respeitado e bem-vindo.", "is_correct": true}]'::jsonb,
      '["4"]'::jsonb, 1, 8
    ),
    (
      'd48d8923-65e3-4ffe-aac7-df54c6fc8468',
      '2e61f18b-aca7-48ad-b9b5-67b67b3bd812',
      'mcq',
      'Durante um pico de atendimento no fim de semana, você já atendeu diversos clientes seguidos, está cansada(o) e um novo cliente chega à sua seção fazendo exigências difíceis e pedindo para ver praticamente todas as peças do estoque. Qual deve ser a sua postura profissional?',
      '[{"id": "1", "text": "Demonstrar cansaço visível, suspirar e avisar que o atendimento será rápido porque você está esgotada(o).", "is_correct": false}, {"id": "2", "text": "Pedir educadamente para o cliente aguardar outro colega livre, retirando-se do atendimento para descansar.", "is_correct": false}, {"id": "3", "text": "Atender apenas o essencial de forma fria para despachar o cliente o mais rápido possível.", "is_correct": false}, {"id": "4", "text": "Manter a cortesia, respirar fundo, acolher o cliente com um sorriso genuíno e prestar um atendimento com o mesmo padrão de excelência e paciência do início do seu turno.", "is_correct": true}]'::jsonb,
      '["4"]'::jsonb, 1, 9
    )
  ON CONFLICT (id) DO UPDATE SET
    question_text = EXCLUDED.question_text,
    options = EXCLUDED.options,
    correct_answer = EXCLUDED.correct_answer;

  -- 4. Inserir a Vaga (Job)
  INSERT INTO public.jobs (
    id, title, description, department, location, job_type, experience_level,
    salary_currency, required_skills, benefits, status, created_by, domain,
    experience_years_range, position_type, total_openings, positions_filled,
    require_digital_application_form, assessment_enabled, default_assessment_id,
    assessment_config, sort_order
  ) VALUES (
    '421171a7-df0b-4f1a-8d5b-232d733e900b',
    'Atendente de Vendas (Operações)',
    'Executar atividades operacionais e de atendimento, garantindo a organização da loja, disponibilidade de produtos e suporte a jornada do cliente.',
    'Vendas',
    'Suzano',
    'full_time',
    'entry',
    'BRL',
    '["Ensino Medio Completo", "identificação com o varejo de moda", "disponibilidade de horário inclusive finais de semana e feriados"]'::jsonb,
    '["Vale alimentação ou refeição; Vale transporte; Assitencia Medica apos 12 meses; Wellhub; Desconto de 30% na Riachuelo"]'::jsonb,
    'open',
    v_admin_id,
    'Sales',
    'fresh',
    'non_tech',
    3,
    0,
    true,
    true,
    'e3b971d8-4da2-428c-a382-c3180c8bf818',
    '{"deadline_days": 7, "pass_threshold_override": null, "notify_recruiter_on_complete": true, "require_pass_before_interview": true}'::jsonb,
    -1
  ) ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    location = EXCLUDED.location,
    status = EXCLUDED.status,
    total_openings = EXCLUDED.total_openings,
    assessment_enabled = EXCLUDED.assessment_enabled,
    default_assessment_id = EXCLUDED.default_assessment_id;

END $$;
