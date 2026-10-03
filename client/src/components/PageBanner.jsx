export default function PageBanner({ title }) {
  return (
    <section className="container page-banner">
      <h1>{title}</h1>
      <span>{title}</span>
    </section>
  );
}
