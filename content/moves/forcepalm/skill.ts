/**
 * 发劲 / forcepalm 的出手方式。
 *
 * 核心念头：上步贴上去，掌心按在对手身上，把一记冲击波**灌进身体里**——物理伤害按力量结算，震动有概率
 * 让它麻痹；透劲式则让波从身体另一侧透出，打到背后直线上的第二个人。这是本组唯一接触的一击。
 *
 * 两幕 + 收：
 *   起（windup，提交前）：沉肩、掌心拢起一层将成的内劲，只播预告、可被打断。
 *   按（execute → strike）：提交后先向目标迈出 `step` 那一步（最多贴到 `reach` 内），再确认掌心是否真的贴上：
 *       贴上就按 `palm` 结算接触物理伤害、把人推开、并按 `numbChance` 掷一次麻痹；没贴上就是扑空。
 *   透（through，仅透劲式）：波从目标背后沿同一条方向再走 `throughReach`，打到直线上的后续目标（`through` 段）。
 *
 * 与同族分开：另外三招都是远程波（持续前推／固定 40 重击／瞬时裂痕），发劲是唯一**贴身上步、按物攻缩放、可打麻**的。
 */
namespace PokemonSkills {
    const forcepalmScene = "world_combat:move_forcepalm";
    const forcepalmHitText = "world_combat.move.forcepalm.text.hit";
    const forcepalmNumbText = "world_combat.move.forcepalm.text.numb";
    const forcepalmThroughText = "world_combat.move.forcepalm.text.through";
    const forcepalmMissText = "world_combat.move.forcepalm.text.miss";

    define({
        id: "forcepalm",
        name: "Force Palm",
        description: "The target is attacked with a shock wave. This may also leave the target with paralysis.",
        uses: ["贴身一掌并按力量结算", "用震动打麻近身的对手", "透劲式连打身后一条线上的第二个目标"],
        kind: "enemy",
        range: 2.4,
        maxRange: 3.6,
        prepare: 8,
        active: 0,
        recover: 8,
        cooldown: 24,
        style: "palm",
        defaults: { through: false, ai: { maxChase: 6, preferNumb: true, leaveStation: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("forcepalm", "collisionRadius", pokemon), geometry: "line", style: "palm", color: 0xFFC46B,
                label: config && config.through === true ? "发劲·透劲" : "发劲" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["forcepalm"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("forcepalm", "tempo", context)),
                recover: Math.round(p("forcepalm", "settle", context)),
                cooldown: Math.round(p("forcepalm", "recharge", context)),
                active: 0,
                range: p("forcepalm", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("forcepalm:windup", forcepalmScene, 1, action.origin(),
                JSON.stringify({ moment: "gather", through: config && config.through === true, windup: prepare }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world(), self = action.actor();
            const through = !!(config && config.through);
            const power = p("forcepalm", "palm", action);
            const reach = p("forcepalm", "reach", action);
            const radius = p("forcepalm", "collisionRadius", action);
            const chance = p("forcepalm", "numbChance", action);
            const push = p("forcepalm", "push", action);
            const throughPower = p("forcepalm", "through", action);
            const throughReach = p("forcepalm", "throughReach", action);
            const cap = Math.max(1, Math.round(p("forcepalm", "throughTargets", action)));
            const step = p("forcepalm", "step", action);
            const motes = Math.max(8, Math.round(p("forcepalm", "motes", action)));
            const direction = aim(action);
            const intensity = Math.max(0.7, Math.min(2.2, motes / 20));
            const target = action.target();
            const aimPoint = action.targetPosition();
            let body = world.observe(self);
            if (body === null) { done(action); return; }
            const flat = WorldCombat.point(aimPoint.x() - body.position().x(), 0, aimPoint.z() - body.position().z());
            const heading = flat.length() < 1e-6 ? direction : flat.unit();
            const distance = flat.length();
            if (distance > reach * 0.7) {
                const lunge = Math.min(step, Math.max(0, distance - reach * 0.7));
                if (lunge > 0) {
                    world.displace(self, heading.scale(lunge));
                    WorldFeedback.emit(world, forcepalmScene, 1, body.position(),
                        { moment: "step", scale: radius / 0.45, motes: motes }, 16);
                    body = world.observe(self);
                    if (body === null) { done(action); return; }
                }
            }
            let victim: CombatActor | null = target !== null && world.valid(target) ? target : null;
            let vbody: CombatObservation | null = victim !== null ? world.observe(victim!) : null;
            const contact = vbody !== null && victim !== null
                && vbody.position().minus(body.position()).length() <= reach + vbody.width() * 0.5;
            if (!contact) {
                WorldFeedback.emit(world, forcepalmScene, 1, aimPoint, { moment: "miss", scale: radius / 0.45, motes: motes }, 20);
                WorldFeedback.text(world, aimPoint.plus(WorldCombat.point(0, 1.0, 0)), forcepalmMissText, [], 22);
                sound(action, "minecraft:entity.player.attack.weak");
                done(action);
                return;
            }
            const landed = hurt(action, victim!, "forcepalm", power,
                { damage: damageSpec("forcepalm", "palm"), contact: true, status: "paralysis", chance: chance });
            sound(action, "minecraft:entity.player.attack.strong");
            if (!landed) { done(action); return; }
            const at = world.observe(victim!)!.position();
            world.displace(victim!, heading.scale(push));
            WorldFeedback.emit(world, forcepalmScene, 1, at,
                { moment: "strike", target: String(victim!.ref()), scale: radius / 0.45, intensity: intensity, motes: motes }, 26);
            WorldFeedback.text(world, at.plus(WorldCombat.point(0, 1.15, 0)), forcepalmHitText, [Math.round(power)], 24);
            if (CombatStatus.has(world, victim!, "paralysis")) {
                WorldFeedback.emit(world, forcepalmScene, 1, at, { moment: "numb", target: String(victim!.ref()), motes: motes }, 24);
                WorldFeedback.text(world, at.plus(WorldCombat.point(0, 1.35, 0)), forcepalmNumbText, [], 24);
            }
            if (through) {
                const lane = WorldGeometry.lane(at, heading, throughReach, radius, { below: 1.5, above: 3 });
                let extra = 0;
                WorldFeedback.emit(world, forcepalmScene, 1, at,
                    { moment: "through", scale: throughReach / 3.2, intensity: intensity, motes: motes, path: [
                        [at.x(), at.y(), at.z()],
                        [at.x() + heading.x() * throughReach, at.y(), at.z() + heading.z() * throughReach] ] }, 24);
                WorldGeometry.selectEnemies(world, lane, function (other: CombatActor, facts: CombatObservation) {
                    if (extra >= cap || String(other.ref()) === String(victim!.ref())) return;
                    extra++;
                    hurt(action, other, "forcepalm", throughPower, { damage: damageSpec("forcepalm", "through") });
                    WorldFeedback.emit(world, forcepalmScene, 1, facts.position(),
                        { moment: "strike", target: String(other.ref()), scale: radius / 0.45, intensity: intensity * 0.85, motes: motes }, 22);
                });
                if (extra > 0) WorldFeedback.text(world, at.plus(WorldCombat.point(0, 1.55, 0)), forcepalmThroughText, [extra], 24);
            }
            done(action);
        }
    });
}
