/**
 * 撕裂爪 / crushclaw 的出手方式。
 *
 * 核心念头：踏前一步，单爪前伸够到第一个接触，再就着接触点向外一拉，把护甲撕开。它比碎岩重、比铁尾快，
 *   撕中时撕甲几率全族最高；而且它主动利用别人开出的缺口——目标已经带着破防身份时，这一撕掀得更深。
 *
 * 三幕：
 *   起（windup，提交前）：爪尖聚起冷光。
 *   击（slash → tear）：提交后朝瞄准方向短踏一步，然后沿同一条刀路探出爪尖；刀路只取**真正的第一个接触**
 *       （前排的身体、同伴或实墙都会截住它），第一个接触是非友方活体时才结算一记 `slash` 接触伤害，
 *       就着接触点向外拉出抓撕刃路；按撕甲几率降防并挂上撕开标记，命中处崩出碎甲。
 *   收：没够到活体就撕空（miss），只留一道划过的爪风，不补十字。
 *
 * 选取为 aim：方向、点或任意阵营实体都能放，路被挡住时爪尖停在接触处，友方不受伤。
 * 与同族分开：碎岩是贴脸连点先开初甲，铁尾是慢而重的下砸；撕裂爪是踏前单爪够到再外拉的一记，专撕别人开出的缺口。
 * 共享身份 world_combat:status/guardbroken 由 startup.ts 声明；本招还消费它来加深撕口。
 */
namespace PokemonSkills {
    const crushclawScene = "world_combat:move_crushclaw";
    const crushclawMark = "world_combat:crushclaw_rent";
    const crushclawTearText = "world_combat.move.crushclaw.text.tear";
    const crushclawMissText = "world_combat.move.crushclaw.text.miss";

    function crushclawPath(points: CombatPoint[]): number[][] {
        return points.map(function (point) { return [point.x(), point.y(), point.z()]; });
    }

    define({
        freeMovement: true,
        id: "crushclaw",
        name: "Crush Claw",
        description: "踏前一步，单爪前伸够到第一个接触后向外一拉，把对手的护甲撕开：撕中时最有可能让目标防御下降一级，目标已经带着破防身份时还会多降一级。刀路只打真正碰到的第一个非友方，前排的身体和墙会先截住它；比碎岩重、比铁尾快。",
        uses: ["踏前单爪够到再外拉撕甲", "对已经被砸开的目标掀得更深", "在中近距离一记换取防御下降"],
        kind: "aim",
        range: 3.0,
        maxRange: 4.0,
        prepare: 6,
        active: 24,
        recover: 8,
        cooldown: 34,
        style: "slash",
        defaults: { ai: { maxChase: 8, ripOpen: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("crushclaw", "lunge", pokemon), geometry: "line", style: "slash", color: 0xC05A5A, label: "撕裂爪" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            var context: NumberContext = { pokemon, skill: skills["crushclaw"], detail: { values: config }, world: world, actor: actor, attributes: attributes };
            return {
                prepare: p("crushclaw", "prepare", context),
                recover: p("crushclaw", "recover", context),
                cooldown: p("crushclaw", "cooldown", context),
                range: Math.max(3.0, p("crushclaw", "lunge", context) + 0.6)
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_crushclaw:windup", crushclawScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", windup: prepare }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const self = world.observe(actor);
            if (self === null) { done(action); return; }
            const start = self.position();
            const direction = aim(action);
            // 公开射程：踏步 + 爪尖合计不超过它（原容差保留在 resolve 里）。
            const total = Math.max(1.8, p("crushclaw", "lunge", action));
            const half = Math.max(0.24, p("crushclaw", "width", action));
            const power = p("crushclaw", "slash", action);
            const chance = p("crushclaw", "tearChance", action);
            const stages = Math.max(1, Math.round(p("crushclaw", "tearStages", action)));
            const deepen = Math.max(0, Math.round(p("crushclaw", "deepen", action)));
            const tearTicks = Math.max(40, Math.round(p("crushclaw", "tearTicks", action)));
            const notes = Math.max(10, Math.round(power * 1.1));
            const heading = WorldGeometry.flatUnit(direction);
            const side = WorldCombat.point(-heading.z(), 0, heading.x());

            // 短踏一步，最多停在接触前；脚被挡住就停在真实位置。爪尖仍从原射程端点探出，总触达不双算。
            let step = total * 0.45;
            const handled = action.target();
            if (handled !== null && world.valid(handled) && !world.friendly(handled)) {
                const body = world.observe(handled);
                if (body !== null) step = Math.min(step, Math.max(0, body.position().minus(start).length() - half - 0.4));
            }
            if (step > 0.05) world.displace(actor, heading.scale(step));
            const moved = world.observe(actor);
            const base = moved === null ? start : moved.position();
            const tip = start.plus(direction.scale(total));

            // 权威判定：刀路的第一接触（含友方身体与实墙）就是爪尖真实停下的地方。
            const contact = action.trace(base, tip, half, true);
            const at = contact.position();
            const lander = contact.hitEntity() ? contact.target() : null;
            const victim = lander !== null && world.valid(lander) && String(lander.ref()) !== String(actor.ref()) && !world.friendly(lander) ? lander : null;
            const pulled = at.plus(side.scale(half * 1.6)).plus(heading.scale(0.25));
            let hits = 0, torn = 0;
            let landed = false;
            if (victim !== null)
                landed = hurt(action, victim, "crushclaw", power, { damage: damageSpec("crushclaw", "slash"), contact: true, slice: true });
            if (landed && victim !== null) {
                hits = 1;
                WorldFeedback.emit(world, crushclawScene, 1, at,
                    { moment: "slash", target: String(victim.ref()), path: crushclawPath([base, at, pulled]),
                        notes: notes, hits: hits, torn: 0, scale: half / 0.55,
                        direction: [direction.x(), direction.y(), direction.z()] }, 26);
                if (world.random() < chance) {
                    const amount = stages + (CombatStatus.has(world, victim, "guardbroken") ? deepen : 0);
                    // 护甲真的被撕开（未被免疫）才留撕口与标记。
                    if (NativeEffects.boost(world, victim, "def", -amount) !== 0
                        && MobEffects.apply(world, victim, crushclawMark, tearTicks, 0) !== null) {
                        torn = 1;
                        WorldFeedback.emit(world, crushclawScene, 1, at,
                            { moment: "tear", target: String(victim.ref()), stages: amount, scale: 1 }, 26);
                        WorldFeedback.text(world, at.plus(WorldCombat.point(0, 1.2, 0)), crushclawTearText, [amount], 30);
                    }
                }
            } else {
                // 友方身体或实墙先截住刀路：爪尖停在接触点，不结算伤害，也不声称命中，更不补十字。
                WorldFeedback.emit(world, crushclawScene, 1, at,
                    { moment: "miss", path: crushclawPath([base, at]), hits: 0, scale: half / 0.55,
                        blocked: contact.blocked() && lander === null ? 1 : 0,
                        direction: [direction.x(), direction.y(), direction.z()] }, 22);
                if (!contact.blocked() && lander === null)
                    WorldFeedback.text(world, at.plus(WorldCombat.point(0, 1.0, 0)), crushclawMissText, [], 24);
            }
            sound(action, "minecraft:entity.player.attack.sweep");
            sound(action, "cobblemon:move.dragonclaw.target");
            done(action);
        }
    });
}
