import Link from "next/link";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "Can I build a form without writing code?",
    answer:
      "Yes. Add fields from the builder, arrange them on the canvas, and publish when the form feels right. Rules, styling, and required fields are configured with visual controls.",
  },
  {
    question: "What can I use Formyst for?",
    answer:
      "Use it for contact forms, feedback, lead capture, applications, surveys, registrations, and multi-step workflows. Single-page and conversational experiences are supported.",
  },
  {
    question: "Can I make a form match my brand?",
    answer:
      "Yes. Choose colors, typography, spacing, button styles, a logo, and a custom header or footer. The public form and preview use the same visual settings.",
  },
  {
    question: "How do conditional questions work?",
    answer:
      "Create a rule in plain language that shows, hides, or routes people based on an earlier answer. Respondents only see the questions that apply to them.",
  },
  {
    question: "Where do responses go?",
    answer:
      "Responses are available in your form dashboard as they arrive. You can review them in a table, inspect analytics, and export your data when you need it.",
  },
  {
    question: "Is Formyst open source?",
    answer: (
      <>
        Formyst is open source. You can inspect the project and contribute on{" "}
        <Link
          className="font-medium text-foreground underline underline-offset-4"
          href="https://github.com/preetsuthar17/Ikiform"
          rel="noopener noreferrer"
          target="_blank"
        >
          GitHub
        </Link>
        .
      </>
    ),
  },
];

export function FAQ() {
  return (
    <section className="border-border/60 border-y bg-muted/20 py-20 sm:py-28" id="faq">
      <div className="mx-auto grid max-w-6xl gap-12 px-4 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <p className="font-medium text-primary text-sm uppercase tracking-wider">
            Questions, answered
          </p>
          <h2 className="mt-3 font-bold text-3xl tracking-tight sm:text-4xl">
            Everything you need to know before you publish.
          </h2>
          <p className="mt-4 text-muted-foreground">
            Start small, test the experience, and add complexity only when your workflow needs it.
          </p>
        </div>
        <Accordion className="w-full" type="single">
          {faqs.map((faq, index) => (
            <AccordionItem className="border-border/70" key={faq.question} value={`faq-${index}`}>
              <AccordionTrigger className="py-5 text-left font-medium hover:no-underline">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="max-w-2xl pb-5 text-muted-foreground leading-relaxed">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
