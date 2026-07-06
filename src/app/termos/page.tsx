import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, LegalSection } from "@/components/voz/legal-page";
import { SUPPORT_EMAIL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Termos de Uso",
  description:
    "Condições de uso da plataforma voz. para organizadores de eventos e participantes.",
  robots: { index: true, follow: true },
};

/** Public Terms of Use. */
export default function TermosPage() {
  return (
    <LegalPage title="Termos de Uso" updatedAt="6 de julho de 2026">
      <p>
        Estes Termos regem o uso da plataforma <strong>voz.</strong> Ao criar
        uma conta ou usar o serviço, você concorda com estas condições e com a{" "}
        <Link href="/privacidade" className="text-primary underline">
          Política de Privacidade
        </Link>
        .
      </p>

      <LegalSection title="1. O serviço">
        <p>
          A voz. é uma plataforma para receber e mediar perguntas do público em
          eventos presenciais, com módulos opcionais de inscrição e
          credenciamento. Podemos evoluir, suspender ou descontinuar
          funcionalidades, comunicando mudanças relevantes.
        </p>
      </LegalSection>

      <LegalSection title="2. Conta e responsabilidades do organizador">
        <ul className="list-disc pl-5">
          <li>
            Você é responsável pela veracidade dos dados de conta e por manter
            suas credenciais em sigilo.
          </li>
          <li>
            Ao coletar dados do público (perguntas, inscrições), você é o
            controlador desses dados e deve ter base legal e finalidade
            adequadas, informando os titulares conforme a LGPD.
          </li>
          <li>
            Você não deve usar a plataforma para conteúdo ilícito, ofensivo ou
            que viole direitos de terceiros.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="3. Planos e pagamento">
        <p>
          Oferecemos um plano gratuito com limites de uso, cobrança avulsa por
          evento e uma assinatura mensal (Pro). Os preços e limites vigentes são
          exibidos na página de{" "}
          <Link href="/planos" className="text-primary underline">
            planos
          </Link>
          . Pagamentos são processados pela Stripe. Assinaturas renovam
          automaticamente até o cancelamento, que pode ser feito a qualquer
          momento e passa a valer ao fim do período já pago. Salvo exigência
          legal, valores já cobrados não são reembolsáveis.
        </p>
      </LegalSection>

      <LegalSection title="4. Uso aceitável">
        <p>
          É vedado tentar burlar limites de plano, sobrecarregar a
          infraestrutura, acessar dados de outros usuários sem autorização ou
          realizar engenharia reversa não permitida por lei.
        </p>
      </LegalSection>

      <LegalSection title="5. Propriedade intelectual">
        <p>
          A marca, o software e o design da voz. são de nossa titularidade. O
          conteúdo que você insere (eventos, perguntas, inscrições) permanece
          seu; você nos concede licença limitada para tratá-lo com o fim de
          operar o serviço.
        </p>
      </LegalSection>

      <LegalSection title="6. Limitação de responsabilidade">
        <p>
          O serviço é fornecido &ldquo;no estado em que se encontra&rdquo;.
          Envidamos esforços para mantê-lo disponível e seguro, mas não
          garantimos operação ininterrupta. Na medida permitida por lei, não
          respondemos por danos indiretos decorrentes do uso.
        </p>
      </LegalSection>

      <LegalSection title="7. Encerramento">
        <p>
          Você pode encerrar sua conta a qualquer momento. Podemos suspender
          contas que violem estes Termos, preservando os direitos do titular
          sobre seus dados.
        </p>
      </LegalSection>

      <LegalSection title="8. Contato e foro">
        <p>
          Dúvidas sobre estes Termos:{" "}
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="text-primary underline"
          >
            {SUPPORT_EMAIL}
          </a>
          . Aplica-se a legislação brasileira, eleito o foro do domicílio do
          consumidor quando aplicável.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
