/**
 * 虫扑 / pounce 的出手方式。
 *
 * 核心念头：从远处高高跃起，沿一条抛物线甩过空中，落在目标身上——体重下坠把它压住，腿脚随即缠住它的动作，
 * 让它沉下来、慢下来。命中后施法者留在目标身边，目标挂着 clung 身份。它与起草（贴地草绿窜跃）、踢倒
 * （直线突进踢）不同：虫扑是**高弧落在目标身上**，落点就是目标本身，之后多出一段缠身的持续状态。
 *
 * 三幕：
 *   起（crouch，提交前）：屈膝压地、看准目标背侧，只播预告。
 *   扑（leap → impact / miss，提交后）：逐刻沿抛物线推进，身体划出弧线、抖落尘点与虫翼；
 *       空中碰到非友方活体即结算 `slam` 接触伤害；命中后目标掉速度等级、挂 clung、腿脚被压住一瞬。
 *   落（miss）：一路扑到底都没碰到人，就在落点扬起尘土。
 *
 * 掉速走 `NativeEffects.boost` 的共享速度等级，对宝可梦和其他生物同一条路。
 */
namespace PokemonSkills {
    const pounceScene = "world_combat:move_pounce";
    const pounceCling = "world_combat:pounce_cling";
    const pounceClingText = "world_combat.move.pounce.text.cling";
    const pounceMissText = "world_combat.move.pounce.text.miss";

    define({
        id: "pounce",
        name: "Pounce",
        description: "The user attacks by pouncing on the target. This also lowers the target's Speed stat.",
        uses: ["从中距离扑上去贴住对手", "先缠住，再用重招收掉", "压住想跑的对手的速度"],
        kind: "enemy",
        range: 4.4,
        maxRange: 4.4,
        prepare: 9,
        active: 0,
        recover: 8,
        cooldown: 26,
        style: "leap",
        defaults: { cling: false, ai: { maxChase: 8, preferFresh: true } },
        fields: [
            flag("cling", "缠身")
        ],
        indicator: function (config, pokemon) {
            return { radius: p("pounce", "leap", pokemon) + 0.5, geometry: "line", style: "leap",
                color: 0xA6C24A, label: config && config.cling === true ? "虫扑·缠身" : "虫扑" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["pounce"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            const cling = !!(config && config.cling);
            return { prepare: Math.round(p("pounce", "tempo", context)) + (cling ? 2 : 0), recover: 8 + (cling ? 3 : 0),
                cooldown: 26 + (cling ? 6 : 0), active: 0, range: p("pounce", "leap", context) + 0.6 };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_pounce:crouch", pounceScene, 1, action.origin(),
                JSON.stringify({ moment: "crouch", cling: config && config.cling ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const body = world.observe(actor);
            if (body === null) { done(action); return; }
            const start = body.position();
            const feet = start.minus(WorldCombat.point(0, body.height() / 2, 0));
            const aimPoint = action.targetPosition();
            const distance0 = p("pounce", "leap", action);
            const pace = p("pounce", "pace", action);
            const apex = p("pounce", "apex", action);
            const girth = p("pounce", "girth", action);
            const power = p("pounce", "slam", action);
            const stages = Math.max(1, Math.round(p("pounce", "slowStages", action)));
            const clingTicks = Math.max(30, Math.round(p("pounce", "clingTicks", action)));
            const rootTicks = Math.max(0, Math.round(p("pounce", "rootTicks", action)));
            const motes = Math.max(10, Math.round(p("pounce", "motes", action)));
            const cling = !!(config && config.cling);
            const scale = (body.width() + body.height()) / 2.3;
            const intensity = Math.max(0.6, Math.min(2.2, power / 50));
            let dx = aimPoint.x() - start.x(), dz = aimPoint.z() - start.z();
            const gap = Math.sqrt(dx * dx + dz * dz);
            if (gap < 0.01) { const facing = aim(action); dx = facing.x(); dz = facing.z(); }
            const span = Math.sqrt(dx * dx + dz * dz) || 1;
            const ux = dx / span, uz = dz / span;
            const distance = Math.min(distance0, Math.max(1.5, gap));
            const steps = Math.max(3, Math.round(distance / pace));
            const landing = WorldCombat.point(feet.x() + ux * distance, feet.y(), feet.z() + uz * distance);
            const arc = WorldCombat.point(feet.x() + ux * distance * 0.5, feet.y() + apex, feet.z() + uz * distance * 0.5);
            let settled = false;
            sound(action, "cobblemon:move.aerialace.actor_1");
            WorldFeedback.emit(world, pounceScene, 1, feet,
                { moment: "launch", target: action.target() === null ? "" : String(action.target()!.ref()),
                    motes: motes, scale: scale, intensity: intensity, cling: cling ? 1 : 0,
                    path: [[feet.x(), feet.y(), feet.z()], [arc.x(), arc.y(), arc.z()], [landing.x(), landing.y(), landing.z()]] }, 30);

            function finish(current: CombatAction): void { if (!settled) { settled = true; done(current); } }

            function strike(current: CombatAction, target: CombatActor): void {
                if (settled) return;
                const scope = current.world();
                const landed = hurt(current, target, "pounce", power, { damage: damageSpec("pounce", "slam"), contact: true });
                const at = scope.observe(target);
                if (at !== null) {
                    if (landed) {
                        NativeEffects.boost(scope, target, "spe", -stages);
                        MobEffects.apply(scope, target, pounceCling, clingTicks, 0);
                        if (rootTicks > 0) WorldEffects.apply(scope, target, "rooted", {}, rootTicks);
                        WorldFeedback.keep(scope, "pounce:cling:" + String(target.ref()), pounceScene, 1, at.position(),
                            { moment: "cling", target: String(target.ref()), stages: stages, motes: motes,
                                intensity: intensity, tick: clingTicks }, clingTicks);
                        WorldFeedback.text(scope, at.position().plus(WorldCombat.point(0, 1.1, 0)), pounceClingText, [stages], 28);
                    }
                    WorldFeedback.emit(scope, pounceScene, 1, at.position(),
                        { moment: "impact", target: String(target.ref()), motes: motes, intensity: intensity, scale: scale }, 26);
                }
                sound(current, "cobblemon:impact.bug");
                finish(current);
            }

            function step(current: CombatAction, index: number): void {
                const scope = current.world();
                const self = scope.observe(actor);
                if (self === null) { finish(current); return; }
                const t = Math.min(1, index / steps);
                const here = WorldCombat.point(feet.x() + ux * distance * t,
                    feet.y() + apex * 4 * t * (1 - t), feet.z() + uz * distance * t);
                const around = scope.query(here.plus(WorldCombat.point(0, self.height() / 2, 0)), girth + 0.6, false);
                for (let i = 0; i < around.length; i++) {
                    const other = around[i];
                    if (String(other.ref()) === String(actor.ref()) || scope.friendly(other)) continue;
                    strike(current, other);
                    return;
                }
                if (!scope.teleport(actor, here)) {
                    const now = scope.observe(actor);
                    if (now !== null) scope.displace(actor, here.minus(now.position().plus(WorldCombat.point(0, -now.height() / 2, 0))));
                }
                WorldFeedback.keep(scope, "pounce:leap:" + String(actor.ref()), pounceScene, 1, here.plus(WorldCombat.point(0, 0.4, 0)),
                    { moment: "leap", motes: Math.round(motes * (0.5 + t * 0.5)), scale: scale, progress: t, cling: cling ? 1 : 0 }, 8);
                if (index >= steps) {
                    WorldFeedback.emit(scope, pounceScene, 1, landing,
                        { moment: "miss", motes: motes, scale: scale }, 22);
                    WorldFeedback.text(scope, landing.plus(WorldCombat.point(0, 1.1, 0)), pounceMissText, [], 22);
                    sound(current, "minecraft:entity.player.attack.weak");
                    finish(current);
                    return;
                }
                current.after(1, function (next: CombatAction) { step(next, index + 1); });
            }
            step(action, 0);
        }
    });
}
