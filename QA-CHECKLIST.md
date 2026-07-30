# QA Checklist — Família Finance

## 1. Autenticação

- [ ] Login com email/senha funciona
- [ ] Cadastro cria usuário e autentica
- [ ] Logout limpa sessão
- [ ] Sessão expirada redireciona para login
- [ ] Onboarding cria família e membro
- [ ] Convite de família funciona

## 2. Transações

- [ ] Adicionar transação (despesa/receita/investimento)
- [ ] Editar transação
- [ ] Excluir transação
- [ ] Filtrar por membro
- [ ] Navegação por mês
- [ ] Transações fixas marcadas
- [ ] Transações compartilhadas marcadas
- [ ] Anúncio de leitor de tela ao adicionar/excluir

## 3. Cartões e Faturas

- [ ] Adicionar cartão de crédito
- [ ] Editar cartão
- [ ] Excluir cartão
- [ ] Upload de fatura
- [ ] Parse de fatura
- [ ] Revisão de itens da fatura
- [ ] Confirmação de categorias
- [ ] Conversão em transações

## 4. Investimentos e Dívidas

- [ ] Adicionar investimento
- [ ] Editar investimento
- [ ] Valor atual usa amount_invested como fallback
- [ ] Adicionar dívida
- [ ] Registrar pagamento de dívida
- [ ] Calculadora de quitação (snowball/avalanche)

## 5. Consultora IA

- [ ] Chat com consultora funciona
- [ ] Insights são gerados
- [ ] Contexto financeiro enviado
- [ ] Histórico de conversas
- [ ] Excluir conversa

## 6. Diário Emocional e Desafios

- [ ] Registrar emoção associada a gasto
- [ ] Análise emocional funciona
- [ ] Criar desafio
- [ ] Progresso do desafio atualiza
- [ ] Conclusão de desafio com badge

## 7. Planejador Doméstico

- [ ] Criar tarefa doméstica
- [ ] Atribuir a membro
- [ ] Marcar como concluída
- [ ] Lista de compras
- [ ] Tarefas recorrentes
- [ ] Converter tarefa em transação

## 8. Membros da Família

- [ ] Listar membros ativos
- [ ] Editar membro
- [ ] Marcar como dependente
- [ ] Desativar membro (soft delete)
- [ ] Membro inativo mostra "Membro removido"

## 9. Dashboard

- [ ] Resumo financeiro mensal
- [ ] Navegação por mês
- [ ] Score de saúde financeira
- [ ] Insights da IA
- [ ] Alerta de assinaturas
- [ ] Comparador de cenários
- [ ] Botão flutuante adiciona transação

## 10. Polish

- [ ] Animações suaves
- [ ] Loading states em todas as telas
- [ ] Empty states informativos
- [ ] Toasts de feedback
- [ ] Pull to refresh no mobile
- [ ] Onboarding tour funciona

## 11. Acessibilidade

- [ ] Tab navega em ordem lógica
- [ ] Focus-visible (anel verde 2px)
- [ ] Foco move para modal ao abrir
- [ ] Foco retorna ao trigger ao fechar
- [ ] Esc fecha modals
- [ ] Enter submete formulários
- [ ] Icon-only buttons têm aria-label
- [ ] role="main" no conteúdo
- [ ] role="banner" no header
- [ ] role="navigation" no bottom nav
- [ ] role="tablist"/role="tab" nas abas
- [ ] role="dialog" nos modais
- [ ] role="progressbar" nas barras
- [ ] aria-live="polite" para loading
- [ ] aria-live="assertive" para erros
- [ ] Skip link funciona
- [ ] 200% zoom sem quebra
- [ ] prefers-contrast: more respeitado
- [ ] Contraste 4.5:1 em texto

## 12. Modo Escuro

- [ ] Toggle no header funciona
- [ ] Toggle instantâneo sem reload
- [ ] Perfil tem seção Aparência (Claro/Escuro/Sistema)
- [ ] Sistema segue prefers-color-scheme
- [ ] Variáveis CSS aplicadas
- [ ] Sombras reduzidas
- [ ] Cores adaptadas (cards, texto, bordas)
- [ ] Transição 200ms suave
- [ ] Splash screen respeita tema
- [ ] Gráficos adaptados
