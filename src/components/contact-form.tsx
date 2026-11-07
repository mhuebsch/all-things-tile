"use client";
import { useState } from "react";
export function ContactForm({ emailEnabled }: { emailEnabled: boolean }) {
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setStatus("sending"); setMessage("");
    const data = Object.fromEntries(new FormData(form).entries());
    try {
      const res = await fetch("/api/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      const result = await res.json();
      if (!res.ok || !result.delivered) throw new Error(result.error || "Your message could not be sent. Please try again or call 218.591.2200.");
      setStatus("success");
      setMessage("Thank you! Your message has been sent. All Things Tile will be in touch soon.");
      form.reset();
    } catch (error) { setStatus("error"); setMessage(error instanceof Error ? error.message : "Please try again."); }
  }
  return <>
    {!emailEnabled && <p className="preview-note">Email delivery is not connected yet. Please call 218.591.2200.</p>}
    <form onSubmit={submit} className="contact-form">
      <div className="contact-fields"><label><span className="sr-only">Name</span><input name="name" placeholder="Name" required minLength={2} maxLength={100} autoComplete="name" /></label>
      <label><span className="sr-only">Email address</span><input type="email" name="email" placeholder="Email Address" required maxLength={254} autoComplete="email" /></label></div>
      <label><span className="sr-only">Project message</span><textarea name="message" placeholder="Message" required minLength={10} maxLength={5000} rows={7} /></label>
      <label className="honeypot" aria-hidden="true">Website<input name="website" tabIndex={-1} autoComplete="off" /></label>
      <div className="form-actions"><button type="submit" disabled={status === "sending" || !emailEnabled}>{status === "sending" ? "Sending…" : "Let's Get Building"}</button></div>
      {message && <p className={`form-status ${status}`} role={status === "error" ? "alert" : "status"}>{message}</p>}
    </form>
  </>;
}
