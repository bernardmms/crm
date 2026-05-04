import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { generateEmailRequestSchema } from '@repo/api-contract';
import type z from 'zod';

type GenerateEmailRequest = z.infer<typeof generateEmailRequestSchema>;

interface OpenAIChatResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

const REFERENCE_EMAILS: string[] = [
  `<html lang="pt-BR">
  <body>
    <div style="max-width:600px;margin:20px auto;background:#fff;border:1px solid #ddd;border-radius:8px;overflow:hidden;font-family:Arial,sans-serif;color:#333;">
      <div style="margin:0;padding:0;">
        <img src="https://i.imgur.com/Bd3tFMO.png" width="100%" alt="STEMIS Header">
      </div>
      <div style="padding:20px;">
        <p>Olá, parceiro!</p>
        <p style="text-align:justify;text-indent:40px;">
          Se a sua equipe precisa <strong>limpar mais usinas em menos tempo</strong>, o <strong>Robô de Limpeza TCR-W1/D1</strong> foi projetado exatamente para isso. Ele acelera o ciclo, reduz o esforço operacional e entrega padronização mesmo em janelas curtas de manutenção.
        </p>
        <h2 style="color:#0aee;font-size:20px;margin-top:10px;">Por que velocidade importa?</h2>
        <ul>
          <li>Melhor aproveitamento das janelas de limpeza;</li>
          <li>Menos deslocamento e menor custo por módulo limpo;</li>
          <li>Maior cobertura de usinas com a mesma equipe;</li>
          <li>Redução de atrasos em ciclos críticos de sujidade.</li>
        </ul>
        <p style="text-align:justify;text-indent:40px;">
          O TCR foi desenvolvido para acelerar o processo mantendo segurança e qualidade, e os resultados de campo mostram isso.
        </p>
        <div style="text-align:center;margin:18px 0;">
          <img src="https://img.mailinblue.com/8941837/images/content_library/original/69373cd2709b83e36af0e0aa.png" alt="Robô TCR-W1" style="max-width:100%;height:auto;border-radius:6px;">
        </div>
        <h2 style="color:#0aee;font-size:20px;margin-top:10px;">A velocidade do TCR em números</h2>
        <ul>
          <li><strong>5 segundos por módulo</strong> em operação típica, acelerando todo o ciclo de limpeza;</li>
          <li><strong>≈66% mais rápido</strong> que o processo manual tradicional;</li>
          <li>Consumo de apenas <strong>2 L por módulo</strong> na versão W1, reduzindo logística e custos;</li>
          <li>Operação constante e padronizada, sem variação entre turnos e equipes.</li>
        </ul>
        <p style="text-align:justify;text-indent:40px;">
          Essa velocidade se traduz em ganhos diretos: mais MWp limpos por dia, menor Opex por ciclo e maior disponibilidade energética para sua usina.
        </p>
        <p style="text-align:justify;text-indent:40px;">
          Clique em "Quero saber mais" e veja como o TCR pode multiplicar a produtividade do seu time.
        </p>
        <div style="text-align:center;margin:20px 0;">
          <a href="https://wa.me/5532984085825?text=Quero%20entender%20como%20o%20Rob%C3%B4%20TCR%20pode%20aumentar%20a%20velocidade%20da%20minha%20opera%C3%A7%C3%A3o&utm_source=brevo&utm_campaign=Rob TCR W1 - 2 Mar&utm_medium=email"
             style="display:inline-block;padding:12px 22px;border-radius:6px;background:#25D366;color:#fff;text-decoration:none;font-weight:700;font-size:16px;">
            💬 Quero saber mais
          </a>
        </div>
        <p style="text-align:center;margin-top:18px;">
          <a href="https://robot.stemis.com.br/pt?utm_source=brevo&utm_campaign=Rob TCR W1 - 2 Mar&utm_medium=email"
             style="display:inline-block;padding:12px 22px;border-radius:6px;background:#2576d3;color:#fff;text-decoration:none;font-weight:700;font-size:16px;">
            Visite nosso site
          </a>
        </p>
      </div>
      <div style="background:#f1f1f1;text-align:center;padding:15px;font-size:13px;color:#555;">
        STEMIS — Tecnologia para usinas de alta performance.
      </div>
    </div>
  </body>
</html>`,
  `<html lang="pt-BR">
  <body>
    <div style="max-width:600px;margin:20px auto;background:#fff;border:1px solid #ddd;border-radius:8px;overflow:hidden;font-family:Arial,sans-serif;color:#333;">
      <div style="margin:0;padding:0;">
        <img src="https://i.imgur.com/Bd3tFMO.png" width="100%" alt="STEMIS Header">
      </div>
      <div style="padding:20px;">
        <p>Olá, parceiro!</p>
        <p style="text-align:justify;text-indent:40px;">
          Notamos seu interesse no <strong>Robô de Limpeza TCR-W1 / D1</strong>.
          Sabemos que equipes de O&M e prestadores de serviços de limpeza enfrentam pressão por padronização, velocidade e controle de custos e da operação nas limpezas, e é exatamente aí que o TCR pode gerar impacto imediato.
        </p>
        <h2 style="color:#0aee;font-size:20px;margin-top:10px;">A falta de controle prejudica sua operação</h2>
        <ul>
          <li>Equipes gastando muitas horas por ciclo de limpeza;</li>
          <li>Variação na qualidade da limpeza entre equipes e turnos;</li>
          <li>Dificuldade em quantificar ganhos e custo por módulo.</li>
        </ul>
        <p style="text-align:justify;text-indent:40px;">
          O <strong>TCR-W1/D1</strong> foi concebido para reduzir essas fricções, entregando limpeza mais rápida, padronizada e com consumo controlado por módulo.
        </p>
        <div style="text-align:center;margin:18px 0;">
          <img src="https://i.imgur.com/Pjm09OD.png" alt="Robô TCR-W1" style="max-width:100%;height:auto;border-radius:6px;">
        </div>
        <h2 style="color:#0aee;font-size:20px;margin-top:10px;">Controle total pelo aplicativo STEMIS</h2>
        <p style="text-align:justify;text-indent:40px;">
          Além da robustez mecânica e velocidade de operação, o robô TCR-W1/D1 oferece uma camada adicional de inteligência através do aplicativo STEMIS, que permite <strong>monitorar e comandar toda a operação diretamente pelo celular</strong>.
        </p>
        <ul>
          <li>Controle remoto completo: iniciar limpeza, pausar, inverter escova e retornar automaticamente;</li>
          <li>Leitura em tempo real de inclinação, horímetro, temperatura e corrente dos motores;</li>
          <li>Alertas automáticos de sobrecarga, inclinação extrema ou necessidade de ajuste;</li>
          <li>Registro automático da operação ao final da limpeza;</li>
          <li>Modo seguro com sensores integrados (inclinação, fim de curso, sobrecorrente, sobretemperatura).</li>
        </ul>
        <p style="text-align:justify;text-indent:40px;">
          Tenha o controle completo da operação na palma da mão, com relatórios, segurança operacional e precisão em cada ciclo de limpeza.
        </p>
        <p style="text-align:justify;text-indent:40px;">
          Clique em "Quero saber mais" e descubra tudo sobre o TCR-W1/D1.
        </p>
        <div style="text-align:center;margin:20px 0;">
          <a href="https://wa.me/5532984085825?text=Quero%20entender%20como%20o%20Rob%C3%B4%20TCR%20pode%20aumentar%20a%20velocidade%20da%20minha%20opera%C3%A7%C3%A3o&utm_source=brevo&utm_campaign=Rob TCR W1 - 1 Mar&utm_medium=email"
             style="display:inline-block;padding:12px 22px;border-radius:6px;background:#25D366;color:#fff;text-decoration:none;font-weight:700;font-size:16px;">
            💬 Quero saber mais
          </a>
        </div>
        <p style="text-align:center;margin-top:18px;">
          <a href="https://robot.stemis.com.br/pt?utm_source=brevo&utm_campaign=Rob TCR W1 - 1 Mar&utm_medium=email"
             style="display:inline-block;padding:12px 22px;border-radius:6px;background:#2576d3;color:#fff;text-decoration:none;font-weight:700;font-size:16px;">
            Visite nosso site
          </a>
        </p>
      </div>
      <div style="background:#f1f1f1;text-align:center;padding:15px;font-size:13px;color:#555;">
        STEMIS — Tecnologia para usinas de alta performance.
      </div>
    </div>
  </body>
</html>`,
  `<html lang="pt-BR">
  <body>
    <div style="max-width:600px;margin:20px auto;background:#fff;border:1px solid #ddd;border-radius:8px;overflow:hidden;font-family:Arial,sans-serif;color:#333;">
      <div style="margin:0;padding:0;">
        <img src="https://i.imgur.com/Bd3tFMO.png" width="100%" alt="STEMIS Header">
      </div>
      <div style="padding:20px;">
        <p>Olá, parceiro!</p>
        <p style="text-align:justify;text-indent:40px;">
          Muitas usinas enfrentam atrasos e custos elevados por causa de equipamentos improvisados ou <strong>robôs importados sem suporte no Brasil</strong>. A falta de peças, manutenção lenta e paradas inesperadas acabam pesando diretamente no Opex e na qualidade da limpeza.
        </p>
        <h2 style="color:#0aee;font-size:20px;margin-top:10px;">Quando o suporte falha, a operação para</h2>
        <ul>
          <li>Equipamentos quebram com frequência e ficam dias parados;</li>
          <li>Peças importadas levam semanas para chegar;</li>
          <li>Sem assistência local, equipes ficam sem alternativa;</li>
          <li>Custos e prazos se tornam imprevisíveis.</li>
        </ul>
        <p style="text-align:justify;text-indent:40px;">
          Para eliminar esse risco, o <strong>TCR-W1/D1</strong> foi projetado com foco total em disponibilidade. Nossa solução oferece <strong>suporte técnico 24/7</strong> e <strong>peças de reposição imediatas no Brasil</strong>, garantindo que sua operação não fique parada por falta de manutenção ou assistência. É um robô industrial, robusto e feito para a realidade do campo.
        </p>
        <div style="text-align:center;margin:18px 0;">
          <img src="https://i.imgur.com/YiVs6jb.jpeg" alt="Robô TCR-W1" style="max-width:100%;height:auto;border-radius:6px;">
        </div>
        <p style="text-align:justify;text-indent:40px;">
          Se você busca uma solução com <strong>confiabilidade, resposta rápida e suporte nacional</strong>, o TCR-W1/D1 é o próximo passo para operar com mais segurança e previsibilidade.
        </p>
        <p style="text-align:justify;text-indent:40px;">
          Clique em "Quero saber mais" e veja como o TCR pode te poupar tempo e dor de cabeça para você focar onde precisa.
        </p>
        <div style="text-align:center;margin:20px 0;">
          <a href="https://wa.me/5532984085825?text=Quero%20entender%20como%20o%20Rob%C3%B4%20TCR%20pode%20aumentar%20a%20velocidade%20da%20minha%20opera%C3%A7%C3%A3o&utm_source=brevo&utm_campaign=Rob TCR W1 - 1 Mar&utm_medium=email"
             style="display:inline-block;padding:12px 22px;border-radius:6px;background:#25D366;color:#fff;text-decoration:none;font-weight:700;font-size:16px;">
            💬 Quero saber mais
          </a>
        </div>
        <p style="text-align:center;margin-top:18px;">
          <a href="https://robot.stemis.com.br/pt?utm_source=brevo&utm_campaign=Rob TCR W1 - 1 Mar&utm_medium=email"
             style="display:inline-block;padding:12px 22px;border-radius:6px;background:#2576d3;color:#fff;text-decoration:none;font-weight:700;font-size:16px;">
            Visite nosso site
          </a>
        </p>
      </div>
      <div style="background:#f1f1f1;text-align:center;padding:15px;font-size:13px;color:#555;">
        STEMIS — Tecnologia para usinas de alta performance.
      </div>
    </div>
  </body>
</html>`,
];

@Injectable()
export class AiEmailService {
  private readonly logger = new Logger(AiEmailService.name);

  constructor(private readonly configService: ConfigService) {}

  async generateEmailContent(
    request: GenerateEmailRequest,
  ): Promise<{ htmlContent: string; subject: string }> {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    const model = this.configService.get<string>('OPENAI_MODEL') ?? 'gpt-4o';

    if (!apiKey) {
      throw new InternalServerErrorException(
        'OpenAI API key is not configured. Set OPENAI_API_KEY in your .env file.',
      );
    }

    const {
      purpose,
      targetAudience,
      keyMessage,
      tone,
      companyName,
      additionalNotes,
    } = request;

    const referenceBlock = REFERENCE_EMAILS.map(
      (html, idx) => `--- EXEMPLO ${idx + 1} ---\n${html}`,
    ).join('\n\n');

    const systemPrompt = `Você é um copywriter especialista em email marketing B2B em português do Brasil.

Sua tarefa é gerar um email HTML completo, usando os EXEMPLOS DE REFERÊNCIA fornecidos como guia de **estilo e estrutura**, mas com **conteúdo totalmente novo** baseado no briefing do usuário.

REGRAS IMPORTANTES:
1. Os exemplos NÃO são templates a serem copiados literalmente. Eles definem o padrão visual e estrutural a seguir.
2. Mantenha do padrão dos exemplos:
   - Layout em container centralizado (max-width 600px, borda arredondada, fundo branco).
   - Header com imagem (use a mesma URL "https://i.imgur.com/Bd3tFMO.png" se o briefing não indicar outra; caso contrário, mantenha um placeholder coerente).
   - Saudação inicial curta ("Olá, parceiro!" ou similar coerente com o tom solicitado).
   - Parágrafos justificados com text-indent.
   - Subtítulos <h2> com a cor padrão #0aee, font-size:20px.
   - Listas <ul>/<li> para enumerar pontos chave.
   - Uso de <strong> para destacar termos relevantes.
   - Pelo menos um CTA principal (botão verde estilo WhatsApp #25D366) e/ou um CTA secundário (botão azul #2576d3 "Visite nosso site").
   - Footer cinza com tagline curta da empresa.
3. Adapte o **conteúdo** (textos, headings, bullets, dor abordada, benefícios, números) ao briefing do usuário. NÃO reaproveite frases dos exemplos quando o assunto for diferente.
4. Adapte o **tom** ao solicitado pelo usuário.
5. Se o briefing não fornecer URLs de imagens internas (corpo do email), pode omitir a imagem do meio ou usar um placeholder coerente; o header deve sempre estar presente.
6. O email deve ser autossuficiente e renderizável em clientes de email: estilos inline, sem <style>, sem <script>, sem classes externas.
7. NÃO inclua marcadores de campanha UTM se o briefing não fornecer; use apenas o link base nos CTAs.

Responda EXCLUSIVAMENTE com um objeto JSON válido neste formato:
{
  "subject": "linha de assunto curta e atraente em pt-BR",
  "htmlContent": "o HTML completo do email, começando com <html lang=\\"pt-BR\\"> e terminando com </html>"
}`;

    const userPrompt = `Briefing do email a ser gerado:
- Empresa: ${companyName}
- Objetivo do email: ${purpose}
- Público-alvo: ${targetAudience}
- Mensagem-chave / CTA: ${keyMessage}
- Tom: ${tone}
${additionalNotes ? `- Observações adicionais: ${additionalNotes}` : ''}

EXEMPLOS DE REFERÊNCIA (use apenas como guia de estilo e estrutura, NÃO copie o conteúdo):

${referenceBlock}

Gere o email completo seguindo as regras do sistema. Retorne apenas o JSON.`;

    let raw: string;
    try {
      const response = await fetch(
        'https://api.openai.com/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model,
            response_format: { type: 'json_object' },
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt },
            ],
            temperature: 0.7,
            max_tokens: 4000,
          }),
        },
      );

      if (!response.ok) {
        const errorBody = await response.text();
        this.logger.error(`OpenAI API error ${response.status}: ${errorBody}`);
        throw new InternalServerErrorException(
          'OpenAI request failed. Check your API key and quota.',
        );
      }

      const data = (await response.json()) as OpenAIChatResponse;
      raw = data.choices[0]?.message?.content ?? '';
    } catch (error) {
      if (error instanceof InternalServerErrorException) throw error;
      this.logger.error('Failed to reach OpenAI API', error);
      throw new InternalServerErrorException(
        'Could not reach the OpenAI API. Check your network connection.',
      );
    }

    let parsed: { subject: string; htmlContent: string };
    try {
      parsed = JSON.parse(raw) as { subject: string; htmlContent: string };
    } catch {
      this.logger.error('Failed to parse OpenAI response', raw);
      throw new InternalServerErrorException(
        'Received an unexpected response from OpenAI. Please try again.',
      );
    }

    if (!parsed.htmlContent || !parsed.subject) {
      this.logger.error('OpenAI response missing required fields', raw);
      throw new InternalServerErrorException(
        'OpenAI returned an incomplete response. Please try again.',
      );
    }

    return { htmlContent: parsed.htmlContent, subject: parsed.subject };
  }
}
