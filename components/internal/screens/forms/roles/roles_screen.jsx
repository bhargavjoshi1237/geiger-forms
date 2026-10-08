"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Copy, KeyRound, Loader2, Lock, Plus, ShieldCheck, Trash2, Users } from "lucide-react";
import { Badge } from "@geiger/ui/badge";
import { Button } from "@geiger/ui/button";
import { Checkbox } from "@geiger/ui/checkbox";
import { Input } from "@geiger/ui/input";
import { Textarea } from "@geiger/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@geiger/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@geiger/ui/dialog";
import {
  DataTable,
  EmptyState,
  Field,
  LoadingArea,
  ScreenHeader,
  SearchInput,
  SectionCard,
  StatsBar,
  Toolbar,
} from "@geiger/ui/screen-kit";
import { Tabs, TabsList, TabsTrigger } from "@geiger/ui/tabs";
import { ListPagination, usePagination } from "@/components/internal/shared/pagination";
import { MainScreenWrapper } from "@/components/internal/shared/screen_wrappers";
import { useRbac } from "@/context/rbac-context";
import { useWorkspaceUrl } from "@/lib/hooks/use-workspace-url";
import { WORKSPACE_PERMISSIONS } from "@/lib/rbac";
import { getUser } from "@/lib/supabase/user";
import {
  createRole,
  ensureSystemRoles,
  listGrants,
  revokeGrant,
  setMemberRole,
  softDeleteRole,
  updateRole,
} from "@/lib/supabase/rbac";

const COLOR_VARIANT = { violet: "purple", blue: "info", emerald: "success", amber: "warning", red: "danger", slate: "neutral" };
const COLORS = Object.keys(COLOR_VARIANT);

const PERMISSION_GROUPS = (() => {
  const groups = new Map();
  for (const p of WORKSPACE_PERMISSIONS) {
    if (!groups.has(p.group)) groups.set(p.group, []);
    groups.get(p.group).push(p);
  }
  return [...groups.entries()].map(([group, items]) => ({ group, items }));
})();

const isOwnerRole = (role) => (role?.permissions || []).includes("*");

const memberName = (g, myId, me) => (g.userId === myId ? `${me?.name || "You"} (you)` : `Member ${g.userId.slice(0, 8)}`);
const matches = (q, values) => values.some((v) => String(v || "").toLowerCase().includes(q));

function RoleBadge({ role }) {
  if (!role) return <Badge variant="neutral">No role</Badge>;
  return <Badge variant={COLOR_VARIANT[role.color] || "neutral"}>{role.name}</Badge>;
}

// Grouped permission checklist; read-only for system roles.
function PermissionMatrix({ role, canManage, onToggle }) {
  const locked = !canManage || role.isSystem;
  const all = isOwnerRole(role);
  const has = new Set(role.permissions);
  return (
    <div className="grid gap-5 md:grid-cols-2">
      {PERMISSION_GROUPS.map(({ group, items }) => (
        <div key={group}>
          <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-text-secondary">{group}</p>
          <div className="space-y-2">
            {items.map((p) => (
              <label key={p.key} className="flex items-center gap-2.5 text-sm text-foreground">
                <Checkbox checked={all || has.has(p.key)} disabled={locked || all} onCheckedChange={(v) => onToggle(p.key, v === true)} />
                <span className="truncate">{p.label}</span>
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function NewRoleDialog({ open, onOpenChange, onCreate }) {
  const [draft, setDraft] = useState({ name: "", description: "", color: "slate" });
  const [saving, setSaving] = useState(false);
  const set = (key) => (value) => setDraft((d) => ({ ...d, [key]: value }));

  const submit = async () => {
    if (!draft.name.trim()) {
      toast.error("Give the role a name.");
      return;
    }
    setSaving(true);
    const ok = await onCreate({ ...draft, name: draft.name.trim() });
    setSaving(false);
    if (ok) {
      setDraft({ name: "", description: "", color: "slate" });
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New role</DialogTitle>
          <DialogDescription>Start empty, then tick the permissions this role should have.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <Field label="Name">
            <Input value={draft.name} onChange={(e) => set("name")(e.target.value)} placeholder="Reviewer" className="border-border bg-surface-card text-foreground" />
          </Field>
          <Field label="Description">
            <Textarea value={draft.description} onChange={(e) => set("description")(e.target.value)} rows={2} className="border-border bg-surface-card text-foreground" />
          </Field>
          <Field label="Color">
            <Select value={draft.color} onValueChange={set("color")}>
              <SelectTrigger className="h-9 w-full border-border bg-surface-card text-xs text-foreground">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COLORS.map((c) => (
                  <SelectItem key={c} value={c} className="capitalize">
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button className="bg-primary text-primary-foreground" onClick={submit} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Create role
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Roles & permissions for the current project: members' roles and each role's permission set.
export function RolesScreen({ focus = "roles" }) {
  const { projectId } = useWorkspaceUrl();
  const { can, userId: myId, refresh: refreshRbac } = useRbac();
  const canAssign = can("forms.team.assign");
  const canManage = can("forms.role.manage");
  const [tab, setTab] = useState("members");
  const [roles, setRoles] = useState([]);
  const [grants, setGrants] = useState([]);
  const [me, setMe] = useState(null);
  const [loadedFor, setLoadedFor] = useState(null);
  const [selectedRoleId, setSelectedRoleId] = useState(null);
  const [creating, setCreating] = useState(false);
  const [memberSearch, setMemberSearch] = useState("");
  const [roleSearch, setRoleSearch] = useState("");

  useEffect(() => {
    if (!projectId) return undefined;
    let alive = true;
    (async () => {
      const user = await getUser();
      const [roleRows, grantRows] = await Promise.all([ensureSystemRoles(projectId, user?.id ?? null), listGrants(projectId)]);
      return { user, roleRows: roleRows ?? [], grantRows: grantRows ?? [] };
    })().then(({ user, roleRows, grantRows }) => {
      if (!alive) return;
      setMe(user);
      setRoles(roleRows);
      setGrants(grantRows);
      setLoadedFor(projectId);
    });
    return () => {
      alive = false;
    };
  }, [projectId]);

  const roleById = useMemo(() => new Map(roles.map((r) => [r.id, r])), [roles]);
  const members = useMemo(() => {
    const byUser = new Map();
    for (const g of grants) if (g.userId && g.status === "active" && !byUser.has(g.userId)) byUser.set(g.userId, g);
    return [...byUser.values()].sort((a, b) => (a.userId === myId ? -1 : b.userId === myId ? 1 : 0));
  }, [grants, myId]);
  const ownerCount = members.filter((g) => isOwnerRole(roleById.get(g.roleId))).length;
  const memberCount = (roleId) => members.filter((g) => g.roleId === roleId).length;
  const selectedRole = roleById.get(selectedRoleId) || roles[0] || null;

  const filteredMembers = useMemo(() => {
    const q = memberSearch.trim().toLowerCase();
    if (!q) return members;
    return members.filter((g) => matches(q, [memberName(g, myId, me), g.userId, g.userId === myId ? me?.email : "", roleById.get(g.roleId)?.name]));
  }, [members, memberSearch, myId, me, roleById]);
  const filteredRoles = useMemo(() => {
    const q = roleSearch.trim().toLowerCase();
    return q ? roles.filter((r) => matches(q, [r.name, r.description])) : roles;
  }, [roles, roleSearch]);
  const memberPager = usePagination(filteredMembers, { resetKey: memberSearch });
  const rolePager = usePagination(filteredRoles, { resetKey: roleSearch });

  const changeRole = async (grant, roleId) => {
    if (!canAssign) return toast.error("You don't have permission to assign roles.");
    if (grant.roleId === roleId) return undefined;
    if (isOwnerRole(roleById.get(grant.roleId)) && !isOwnerRole(roleById.get(roleId)) && ownerCount <= 1) {
      return toast.error("This is the last owner — make someone else Owner first.");
    }
    const previous = grants;
    setGrants((cur) => cur.map((g) => (g.id === grant.id ? { ...g, roleId } : g)));
    const saved = await setMemberRole({ projectId, userId: grant.userId, roleId, grantedBy: me?.id ?? null, currentGrants: previous });
    if (!saved) {
      setGrants(previous);
      return toast.error("Couldn't change the role.");
    }
    setGrants((cur) => [...cur.filter((g) => g.userId !== grant.userId), saved]);
    if (grant.userId === myId) refreshRbac();
    return toast.success(`Role changed to ${roleById.get(roleId)?.name}`);
  };

  const removeMember = async (grant) => {
    if (!canAssign) return toast.error("You don't have permission to remove members.");
    if (isOwnerRole(roleById.get(grant.roleId)) && ownerCount <= 1) return toast.error("You can't remove the last owner.");
    const previous = grants;
    setGrants((cur) => cur.filter((g) => g.userId !== grant.userId));
    const results = await Promise.all(previous.filter((g) => g.userId === grant.userId).map((g) => revokeGrant(g.id)));
    if (results.some((ok) => !ok)) {
      setGrants(previous);
      return toast.error("Couldn't revoke their access.");
    }
    if (grant.userId === myId) refreshRbac();
    return toast.success("Access revoked");
  };

  const togglePermission = async (role, key, on) => {
    const next = on ? [...new Set([...role.permissions, key])] : role.permissions.filter((p) => p !== key);
    setRoles((cur) => cur.map((r) => (r.id === role.id ? { ...r, permissions: next } : r)));
    const saved = await updateRole(role.id, { permissions: next });
    if (!saved) {
      setRoles((cur) => cur.map((r) => (r.id === role.id ? role : r)));
      toast.error("Couldn't update the role.");
    } else refreshRbac();
  };

  const addRole = async (draft, permissions = []) => {
    const id = crypto.randomUUID();
    const optimistic = { id, projectId, key: null, permissions, isSystem: false, sort: roles.length, ...draft };
    setRoles((cur) => [...cur, optimistic]);
    const saved = await createRole({ id, projectId, ...draft, permissions, isSystem: false, sort: roles.length, createdBy: me?.id ?? null });
    if (!saved) {
      setRoles((cur) => cur.filter((r) => r.id !== id));
      toast.error("Couldn't create the role.");
      return false;
    }
    setRoles((cur) => cur.map((r) => (r.id === id ? saved : r)));
    setSelectedRoleId(id);
    setTab("roles");
    toast.success("Role created");
    return true;
  };

  const deleteRole = async (role) => {
    if (memberCount(role.id)) return toast.error("Move its members to another role first.");
    setRoles((cur) => cur.filter((r) => r.id !== role.id));
    if (!(await softDeleteRole(role.id))) {
      setRoles((cur) => [...cur, role]);
      return toast.error("Couldn't delete the role.");
    }
    setSelectedRoleId(null);
    return toast.success("Role deleted");
  };

  const access = focus === "access";
  const header = (
    <ScreenHeader
      title={access ? "Access Control (SSO/RBAC)" : "Roles & Permissions"}
      description="Who can see and do what in this project's Forms workspace. Roles are shared suite-wide; assignments here only affect Forms."
      actions={
        projectId ? (
          <Button className="bg-primary text-primary-foreground" disabled={!canManage} onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" /> New role
          </Button>
        ) : null
      }
    />
  );

  if (!projectId) {
    return (
      <MainScreenWrapper>
        {header}
        <div className="rounded-xl border border-border bg-surface-subtle">
          <EmptyState
            icon={KeyRound}
            title="Open a project to manage roles"
            description="Roles and grants are scoped to a project. This standalone workspace isn't attached to one, so everyone here has full access."
          />
        </div>
      </MainScreenWrapper>
    );
  }

  if (loadedFor !== projectId) {
    return (
      <MainScreenWrapper>
        {header}
        <LoadingArea panel size={40} label="Loading roles" />
      </MainScreenWrapper>
    );
  }

  const stats = [
    { label: "Members", value: String(members.length) },
    { label: "Roles", value: String(roles.length), footer: `${roles.filter((r) => !r.isSystem).length} custom` },
    { label: "Owners", value: String(ownerCount) },
    { label: "Permissions", value: String(WORKSPACE_PERMISSIONS.length), footer: "In the Forms catalog" },
  ];

  const memberColumns = [
    {
      key: "user",
      header: "Member",
      render: (g) => (
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">{memberName(g, myId, me)}</p>
          <p className="font-mono text-[11px] text-text-tertiary">{g.userId === myId ? me?.email : g.userId}</p>
        </div>
      ),
    },
    {
      key: "role",
      header: "Role",
      render: (g) =>
        canAssign ? (
          <Select value={g.roleId || ""} onValueChange={(roleId) => changeRole(g, roleId)}>
            <SelectTrigger className="h-8 w-44 border-border bg-surface-card text-xs text-foreground">
              <SelectValue placeholder="Pick a role" />
            </SelectTrigger>
            <SelectContent>
              {roles.map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  {r.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <RoleBadge role={roleById.get(g.roleId)} />
        ),
    },
    {
      key: "scope",
      header: "Scope",
      render: (g) => <span className="text-xs text-text-secondary">{Object.keys(g.scope || {}).length ? "Limited forms" : "Whole project"}</span>,
    },
    {
      key: "since",
      header: "Since",
      align: "right",
      render: (g) => <span className="text-xs text-text-tertiary">{g.createdAt ? new Date(g.createdAt).toLocaleDateString() : "—"}</span>,
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (g) =>
        canAssign && g.userId !== myId ? (
          <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:bg-red-500/10" aria-label="Revoke access" onClick={() => removeMember(g)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        ) : null,
    },
  ];

  return (
    <MainScreenWrapper>
      {header}
      <StatsBar stats={stats} />
      <Toolbar>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="members"><Users />Members</TabsTrigger>
            <TabsTrigger value="roles"><ShieldCheck />Roles</TabsTrigger>
          </TabsList>
        </Tabs>
        {tab === "members" ? (
          <SearchInput key="members" value={memberSearch} onChange={setMemberSearch} placeholder="Search members or roles…" />
        ) : (
          <SearchInput key="roles" value={roleSearch} onChange={setRoleSearch} placeholder="Search roles…" />
        )}
      </Toolbar>

      {tab === "members" ? (
        <>
          <div className="space-y-5">
            <DataTable
              columns={memberColumns}
              data={memberPager.pageItems}
              getRowKey={(g) => g.userId}
              empty={
                <div className="rounded-xl border border-border bg-surface-subtle">
                  {members.length ? (
                    <EmptyState
                      icon={Users}
                      title="No members match your search"
                      description="Try a different name, user id, or role."
                      action={
                        <Button variant="outline" onClick={() => setMemberSearch("")}>
                          Clear search
                        </Button>
                      }
                    />
                  ) : (
                    <EmptyState icon={Users} title="No members yet" description="People join automatically with the Member role the first time they open this project's Forms workspace." />
                  )}
                </div>
              }
            />
            <ListPagination {...memberPager} itemLabel="members" />
          </div>
          <p className="text-xs text-text-tertiary">
            Members are added when they first open the project; invite people from the suite hub. Per-form sharing lives under Team &amp; Sharing.
          </p>
        </>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[18rem_minmax(0,1fr)]">
          <SectionCard title="Roles" bodyPadding={false}>
            {roles.length && !filteredRoles.length ? (
              <EmptyState
                icon={ShieldCheck}
                title="No roles match"
                description="Try a different name or description."
                action={
                  <Button variant="outline" size="sm" onClick={() => setRoleSearch("")}>
                    Clear search
                  </Button>
                }
              />
            ) : null}
            <ul className="divide-y divide-border">
              {rolePager.pageItems.map((r) => (
                <li key={r.id}>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setSelectedRoleId(r.id)}
                    className={`h-auto w-full justify-between gap-2 whitespace-normal rounded-none px-4 py-3 text-left font-normal hover:bg-surface-hover ${selectedRole?.id === r.id ? "bg-surface-hover" : ""}`}
                  >
                    <span className="min-w-0">
                      <RoleBadge role={r} />
                      <span className="mt-1 block truncate text-xs text-text-secondary">{r.description || "Custom role"}</span>
                    </span>
                    <span className="flex shrink-0 items-center gap-1.5 text-xs text-text-tertiary">
                      {r.isSystem ? <Lock className="h-3 w-3" /> : null}
                      {memberCount(r.id)}
                    </span>
                  </Button>
                </li>
              ))}
            </ul>
            <ListPagination {...rolePager} itemLabel="roles" className="border-t border-border px-4 py-3" />
          </SectionCard>
          {selectedRole ? (
            <SectionCard
              title={selectedRole.name}
              description={
                isOwnerRole(selectedRole)
                  ? "Owners hold every permission, including ones added later."
                  : selectedRole.isSystem
                    ? "System role from the Forms catalog — duplicate it as a custom role to change permissions."
                    : canManage
                      ? "Changes apply immediately to everyone with this role."
                      : "You can view this role but not change it."
              }
              action={
                !canManage ? null : selectedRole.isSystem ? (
                  isOwnerRole(selectedRole) ? null : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        addRole(
                          { name: `${selectedRole.name} (custom)`, description: selectedRole.description, color: selectedRole.color },
                          selectedRole.permissions,
                        )
                      }
                    >
                      <Copy className="h-3.5 w-3.5" /> Duplicate
                    </Button>
                  )
                ) : (
                  <Button variant="ghost" size="sm" className="text-red-400 hover:bg-red-500/10" onClick={() => deleteRole(selectedRole)}>
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </Button>
                )
              }
            >
              <PermissionMatrix role={selectedRole} canManage={canManage} onToggle={(key, on) => togglePermission(selectedRole, key, on)} />
            </SectionCard>
          ) : null}
        </div>
      )}

      {access ? (
        <SectionCard title="Single sign-on & 2FA">
          <p className="text-sm text-text-secondary">
            Sign-in, SSO (SAML/OIDC), and two-factor authentication are handled by the Geiger suite account, not by Forms — configure them in the suite&apos;s organization settings. Forms enforces roles on top of that session; for respondent-side access, use a form&apos;s Access &amp; Sharing section (login-only, organization domain, signed links).
          </p>
        </SectionCard>
      ) : null}

      <NewRoleDialog open={creating} onOpenChange={setCreating} onCreate={addRole} />
    </MainScreenWrapper>
  );
}

export default RolesScreen;
