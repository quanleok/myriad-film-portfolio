import { PersonCard } from "@/components/person-card";
import { people } from "@/lib/sample-data";

export default function PeoplePage() {
  return (
    <div>
      <div className="signal-kicker">People</div>
      <h1 className="mt-3 text-4xl font-semibold tracking-[-0.05em]">The voices shaping the rankings.</h1>
      <p className="mt-3 max-w-3xl text-base leading-7 text-slate-300">
        This product is social, but not random. People are legible by category, expertise, and contribution quality.
      </p>
      <div className="mt-6 grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
        {people.map((person) => (
          <PersonCard key={person.id} person={person} />
        ))}
      </div>
    </div>
  );
}
