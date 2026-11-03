import type { Metadata } from "next";
import { ContactForm } from "@/components/contact-form";
export const metadata: Metadata = { title: "Contact - All Things Tile" };
export default function Contact() {
  return <main id="main-content" className="site-width contact-main"><h1>CONTACT</h1>
    <p>Call All Things Tile at <a href="tel:+12185912200">218.591.2200</a> or send a message using the form below.</p>
    <p>Provide a little contact information about yourself, and an overview of the project you have in mind and All Things Tile will get back to you soon.</p>
    <ContactForm emailEnabled={process.env.CONTACT_EMAIL_ENABLED === "true"} />
  </main>;
}
