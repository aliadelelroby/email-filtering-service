import { redirect } from "next/navigation";
import Image from "next/image";

export default function Home() {
  redirect("/dashboard");

  // This part won't execute due to the redirect
  return null;
}
