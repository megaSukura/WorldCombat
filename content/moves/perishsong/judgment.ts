/** Brief independent feedback survives the singer's potentially fatal last native hit. */
namespace PerishJudgments {
    interface Entry { ref: string; point: number[]; attempted: boolean; actual: number; after: number | null; died: boolean; }
    interface Journal { source: string; tick: number; entries: Entry[]; }
    const journals: { [token: string]: Journal } = Object.create(null);
    const observer = "world_combat:move_perishsong/judgment";
    let sequence = 0;
    WorldCombat.on("world_combat:perishsong/receipt", "world_combat:damage_settled", "", event => {
        const data = JSON.parse(event.data()), journal = journals[String(data.perishReceipt || "")];
        if (!journal || String(event.actor().ref()) !== journal.source) return;
        const target = event.target();
        if (!target) return;
        const entry = journal.entries.filter(item => item.ref === String(target.ref()) && item.attempted)[0];
        if (!entry) return;
        entry.actual = data.settled === true ? Math.max(0, Number(data.actual) || 0) : 0;
        entry.after = typeof data.after === "number" ? data.after : null;
    });
    WorldBodies.define(observer, {
        maxTicks: 60,
        start: body => body.schedule("show", "show", 2, "{}"),
        resume: body => body.end(),
        end: body => { delete journals[JSON.parse(body.state()).token]; },
        observedDeath: (body, death) => {
            const journal = journals[JSON.parse(body.state()).token];
            if (!journal || death.tick !== journal.tick || death.sourceEntity !== journal.source.split("/")[0]
                || death.damageType !== "world_combat_core:action_independent") return;
            const entry = journal.entries.filter(item => item.ref === death.victim && item.actual > 0 && item.after !== null && item.after <= 0)[0];
            if (entry) entry.died = true;
        },
        handlers: { show: body => {
            const journal = journals[JSON.parse(body.state()).token];
            if (!journal) { body.end(); return; }
            const world = body.world();
            journal.entries.forEach(entry => {
                if (!entry.attempted) return;
                const at = WorldCombat.point(entry.point[0], entry.point[1], entry.point[2]);
                const hit = entry.actual > 0, moment = !hit ? "resist" : entry.died ? "doom" : "judge";
                WorldFeedback.emit(world, "world_combat:move_perishsong", 1, at,
                    { moment, target: entry.ref, amount: Math.round(entry.actual * 10) / 10 }, hit ? 40 : 24);
                WorldFeedback.text(world, at.plus(WorldCombat.point(0, 1.2, 0)),
                    !hit ? PokemonSkills.perishResistText : entry.died ? PokemonSkills.perishDoomText : PokemonSkills.perishWithstandText, [], 30);
                if (entry.died) world.sound("minecraft:particle.soul_escape", at, 16, "{}");
            });
            delete journals[JSON.parse(body.state()).token];
            body.remaining(44);
        } }
    });
    export function prepare(world: CombatWorld, source: CombatActor, origin: CombatPoint,
                            recipients: { target: CombatActor; ref: string }[]): string {
        const token = String(source.ref()) + ":" + world.tick() + ":" + (++sequence);
        journals[token] = { source: String(source.ref()), tick: world.tick(), entries: recipients.map(item => {
            const facts = world.observe(item.target), at = facts ? facts.position() : origin;
            return { ref: item.ref, point: [at.x(), at.y(), at.z()], attempted: false, actual: 0, after: null, died: false };
        }) };
        try {
            WorldBodies.spawn(world, origin, { size: [.1, .1], health: 1, gravity: false, pushable: false,
                targetable: false, noPhysics: true, invulnerable: true, silent: true }, observer, { token }, 60);
        } catch (failure) { delete journals[token]; return ""; }
        return token;
    }
    export function attempt(token: string, ref: string): void {
        const journal = journals[token];
        if (journal) journal.entries.forEach(entry => { if (entry.ref === ref) entry.attempted = true; });
    }
}
