import type { Metadata } from "next";
import { LegalPage, LegalSection } from "@/components/voz/legal-page";
import { DPO_EMAIL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Política de Privacidade",
  description:
    "Como a voz. coleta, usa, compartilha e protege dados pessoais, e como você exerce seus direitos sob a LGPD.",
  robots: { index: true, follow: true },
};

/** Public Privacy Policy (LGPD Art. 9º / transparência). */
export default function PrivacidadePage() {
  return (
    <LegalPage title="Política de Privacidade" updatedAt="6 de julho de 2026">
      <p>
        Esta Política descreve como a <strong>voz.</strong>{" "}
        (&ldquo;plataforma&rdquo;, &ldquo;nós&rdquo;) trata dados pessoais de
        organizadores de eventos e do público participante, em conformidade com
        a Lei nº 13.709/2018 (LGPD).
      </p>

      <LegalSection title="1. Quem é o controlador">
        <p>
          A voz. é a controladora dos dados de conta dos organizadores. Em
          relação aos dados do público de um evento (perguntas e inscrições), a
          voz. atua como <strong>operadora</strong>, tratando os dados por conta
          e ordem do organizador, que é o controlador daquele evento.
        </p>
      </LegalSection>

      <LegalSection title="2. Dados que tratamos">
        <ul className="list-disc pl-5">
          <li>
            <strong>Conta do organizador:</strong> nome, e-mail e credenciais de
            acesso (autenticação via Clerk).
          </li>
          <li>
            <strong>Perguntas do público:</strong> texto da pergunta e, quando
            fornecidos, nome e contato do autor. Perguntas podem ser enviadas de
            forma anônima.
          </li>
          <li>
            <strong>Inscrições:</strong> nome, e-mail, telefone e documento,
            quando o organizador habilita o credenciamento.
          </li>
          <li>
            <strong>Pagamento:</strong> dados de assinatura e cobrança são
            processados pela Stripe; não armazenamos números de cartão.
          </li>
          <li>
            <strong>Dados técnicos:</strong> registros mínimos de segurança. O
            endereço IP do autor de uma pergunta é usado apenas para prevenção
            de abuso e <strong>nunca</strong> é exposto em nossas APIs públicas.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="3. Finalidades e bases legais">
        <ul className="list-disc pl-5">
          <li>
            <strong>Prestação do serviço</strong> (execução de contrato, LGPD
            art. 7º, V): criar e gerenciar eventos, receber perguntas, conduzir
            a mediação ao vivo e emitir cobranças.
          </li>
          <li>
            <strong>Segurança e prevenção a fraude</strong> (legítimo interesse,
            art. 7º, IX): limitação de taxa e registros de segurança.
          </li>
          <li>
            <strong>Comunicações transacionais</strong> (execução de contrato):
            confirmações de inscrição, pagamento e avisos operacionais.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="4. Compartilhamento com operadores">
        <p>
          Utilizamos prestadores que tratam dados exclusivamente para operar a
          plataforma:
        </p>
        <ul className="list-disc pl-5">
          <li>
            <strong>Clerk</strong> — autenticação e gestão de identidade.
          </li>
          <li>
            <strong>Stripe</strong> — processamento de pagamentos e assinaturas.
          </li>
          <li>
            <strong>Neon / Supabase</strong> — banco de dados.
          </li>
          <li>
            <strong>Vercel</strong> — hospedagem da aplicação.
          </li>
        </ul>
        <p>
          Alguns operadores podem tratar dados fora do Brasil. Nesses casos, a
          transferência internacional observa as salvaguardas exigidas pela LGPD
          (art. 33).
        </p>
      </LegalSection>

      <LegalSection title="5. Retenção">
        <p>
          Mantemos os dados pelo tempo necessário às finalidades acima e às
          obrigações legais. Encerrado o evento ou a conta, os dados pessoais
          são eliminados ou anonimizados conforme os prazos aplicáveis, salvo
          quando a conservação for exigida por lei.
        </p>
      </LegalSection>

      <LegalSection title="6. Seus direitos (LGPD art. 18)">
        <p>
          Você pode solicitar acesso, correção, anonimização, portabilidade e
          eliminação dos seus dados. Organizadores podem exportar e eliminar
          seus dados diretamente pela área <strong>Minha conta</strong>. Demais
          titulares podem exercer seus direitos pelo canal abaixo.
        </p>
      </LegalSection>

      <LegalSection title="7. Encarregado (DPO) e contato">
        <p>
          Para exercer direitos ou tirar dúvidas sobre privacidade, fale com
          nosso Encarregado pelo Tratamento de Dados Pessoais:{" "}
          <a href={`mailto:${DPO_EMAIL}`} className="text-primary underline">
            {DPO_EMAIL}
          </a>
          . Responderemos no prazo previsto na LGPD.
        </p>
      </LegalSection>

      <LegalSection title="8. Alterações">
        <p>
          Podemos atualizar esta Política. Mudanças relevantes serão comunicadas
          na plataforma. A data de última atualização consta no topo desta
          página.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
