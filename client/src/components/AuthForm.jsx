import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { toast } from "sonner";
import { api } from "../utils/api";
import { ON_LOGIN } from "../store";
export default function AuthForm({ register = false }) {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    phone: "",
  });
  const [error, setError] = useState("");
  const changeField = (key, value) => {
    setForm({ ...form, [key]: value });
  };
  const [busy, setBusy] = useState(false);
  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (register) {
        await api("/api/auth/register", {
          method: "POST",
          body: JSON.stringify(form),
        });
        toast.success("Đăng ký thành công");
        navigate("/login");
      } else {
        const user = await api("/api/auth/login", {
          method: "POST",
          body: JSON.stringify({ email: form.email, password: form.password }),
        });
        dispatch(ON_LOGIN(user));
        navigate("/");
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="auth-page">
      <form className="auth-card" onSubmit={submit}>
        <h1>{register ? "Sign Up" : "Sign In"}</h1>
        {error && <p className="form-error">{error}</p>}

        {register && (
          <input
            value={form.fullName}
            onChange={(event) => changeField("fullName", event.target.value)}
            required
            aria-label="Full name"
            placeholder="Full name"
          />
        )}

        <input
          type="email"
          value={form.email}
          onChange={(event) => changeField("email", event.target.value)}
          required
          aria-label="Email"
          placeholder="Email"
        />
        <input
          type="password"
          value={form.password}
          onChange={(event) => changeField("password", event.target.value)}
          required
          aria-label="Password"
          placeholder="Password"
        />

        {register && (
          <input
            value={form.phone}
            onChange={(event) => changeField("phone", event.target.value)}
            required
            aria-label="Phone"
            placeholder="Phone"
          />
        )}

        <button className="dark-button" disabled={busy}>
          {register ? "SIGN UP" : "SIGN IN"}
        </button>
        <p>
          {register ? "Login? " : "Create an account? "}
          <Link to={register ? "/login" : "/register"}>
            {register ? "Click" : "Sign up"}
          </Link>
        </p>
      </form>
    </section>
  );
}
