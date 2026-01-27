import { supabase } from "./supabase";

// MAKE FUNCTIONS GLOBAL FOR HTML
(window as any).signup = signup;
(window as any).login = login;

async function signup() {
  const email = (document.getElementById("email") as HTMLInputElement).value;
  const password = (document.getElementById("password") as HTMLInputElement).value;
  const role = (document.getElementById("role") as HTMLSelectElement).value;

  const { data, error } = await supabase.auth.signUp({
    email,
    password
  });

  if (error) {
    alert(error.message);
    return;
  }

  const userId = data.user?.id;

  if (userId) {
    await supabase.from("profiles").insert({
      id: userId,
      role: role
    });
  }

  alert("Signup successful! Please login.");
}

async function login() {
  const email = (document.getElementById("email") as HTMLInputElement).value;
  const password = (document.getElementById("password") as HTMLInputElement).value;

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    alert(error.message);
    return;
  }

  const userId = data.user.id;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();

  if (profile?.role === "admin") {
    window.location.href = "admin.html";
  } else {
    window.location.href = "student.html";
  }
}
