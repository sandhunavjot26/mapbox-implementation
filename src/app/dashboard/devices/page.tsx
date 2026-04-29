import { redirect } from "next/navigation";

/** Full-page devices URL is no longer used — inventory opens as a map overlay. */
export default function DevicesPageRedirect() {
  redirect("/dashboard");
}
