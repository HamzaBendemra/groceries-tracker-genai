import { redirect } from "next/navigation";
import { acceptInviteAction, createInviteAction } from "@/app/(app)/actions";
import { getAppContext } from "@/lib/data/context";
import { createClient } from "@/lib/supabase/server";

export default async function HouseholdPage() {
  const context = await getAppContext();
  if (!context) {
    redirect("/auth");
  }

  const supabase = await createClient();

  const [{ data: members }, { data: invites }] = await Promise.all([
    supabase
      .from("household_members")
      .select("user_id,role,profiles(display_name)")
      .eq("household_id", context.activeHousehold.id)
      .order("role", { ascending: true }),
    supabase
      .from("household_invites")
      .select("id,invite_code,role,expires_at,used_at")
      .eq("household_id", context.activeHousehold.id)
      .is("used_at", null)
      .is("revoked_at", null)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="space-y-4 rounded-3xl border border-white/40 bg-white/80 p-5 shadow-[0_20px_60px_-45px_rgba(24,40,78,0.45)] backdrop-blur">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Members</p>
          <h2 className="font-display text-2xl text-slate-900">Household access</h2>
        </div>

        <div className="space-y-2">
          {(members ?? []).map((member) => (
            <div key={member.user_id} className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <p className="text-sm font-medium text-slate-900">
                {(member.profiles as { display_name?: string } | null)?.display_name ?? member.user_id}
              </p>
              <p className="text-xs uppercase tracking-[0.15em] text-slate-500">{member.role}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4 rounded-3xl border border-white/40 bg-white/80 p-5 shadow-[0_20px_60px_-45px_rgba(24,40,78,0.45)] backdrop-blur">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Sharing</p>
          <h2 className="font-display text-2xl text-slate-900">Invite and join</h2>
        </div>

        {context.activeHousehold.role === "owner" ? (
          <form action={createInviteAction} className="grid gap-2 rounded-2xl bg-slate-50 p-3">
            <label className="text-sm text-slate-700">
              Invite role
              <select
                name="role"
                defaultValue="member"
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
              >
                <option value="member">Member</option>
                <option value="helper">Helper</option>
              </select>
            </label>
            <button
              type="submit"
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
            >
              Generate invite code
            </button>
          </form>
        ) : (
          <p className="rounded-2xl border border-dashed border-slate-300 px-4 py-4 text-sm text-slate-600">
            Only household owners can generate invite codes.
          </p>
        )}

        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.15em] text-slate-500">Active codes</p>
          {(invites ?? []).length === 0 ? (
            <p className="rounded-2xl border border-dashed border-slate-300 px-4 py-4 text-sm text-slate-500">
              No active invite codes.
            </p>
          ) : (
            invites?.map((invite) => (
              <div key={invite.id} className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                <p className="font-mono text-lg font-medium text-slate-900">{invite.invite_code}</p>
                <p className="text-xs text-slate-500">Role: {invite.role}</p>
              </div>
            ))
          )}
        </div>

        <form action={acceptInviteAction} className="grid gap-2 rounded-2xl bg-slate-50 p-3">
          <label className="text-sm text-slate-700">
            Join with invite code
            <input
              name="inviteCode"
              placeholder="ABC1234"
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
            />
          </label>
          <button
            type="submit"
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-500 hover:text-slate-900"
          >
            Join household
          </button>
        </form>
      </section>
    </div>
  );
}
