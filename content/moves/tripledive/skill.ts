/**
 * 三连钻 / tripledive 的出手方式。
 *
 * 核心念头：三次利落的钻击。跳起来、扎下去，每一钻都溅起一片水花打在对手身上；水留在它身上，
 *   下一钻因此更重——三下都落在同一个目标上时，第三下最狠。它的身份是「水花留在身上」的连钻。
 *
 * 两幕（三钻）：
 *   起（windup，提交前）：屈膝收身，脚下水光打转，只播预告。
 *   钻（execute，提交后）：按 `interval` 起跳三次，每一钻先朝目标贴一段、再按当前与目标的距离结算（diveSpan／
 *       diveRadius），命中结算一段 `splash` 接触伤害；命中时把「湿透」（共享身份 `world_combat:status/drenched`）
 *       打到目标身上并计时；已经湿透的目标这一钻吃 `soakBonus` 倍威力。三钻结束才收招。
 *   落（finish）：三钻落地，收势。
 *
 * 与同族分开：三连箭是三支箭**同时**离弦、骨头回力镖是**同一根骨头去与回**、鼠数儿是**先后不断加入的伙伴**；
 *   三连钻是**固定三下、每下都留下水**的连钻——它的「三」是死的，价值在那层越叠越重的湿身。
 *
 * 配置 `plunge` 由 resolve 改时序、由公式改跳跃／威力／判定，提交后才触碰世界。
 */
namespace PokemonSkills {
    const triplediveScene = "world_combat:move_tripledive";
    const triplediveDrenched = "world_combat:tripledive_drenched";
    const triplediveSplashText = "world_combat.move.tripledive.text.splash";
    const triplediveFullText = "world_combat.move.tripledive.text.full";
    const triplediveMissText = "world_combat.move.tripledive.text.miss";

    define({
        id: "tripledive",
        name: "三连钻",
        description: "以默契的跳跃溅起水花击向对手。连续 3 次给予伤害。",
        uses: ["连续三次钻击同一个目标，越钻越重", "先手把目标打湿，给后续水属性招式铺垫", "在近身短暂窗口里堆出三下小伤害"],
        kind: "enemy",
        range: 3.0,
        maxRange: 3.8,
        prepare: 8,
        active: 24,
        recover: 6,
        cooldown: 28,
        style: "dive",
        defaults: { plunge: false, ai: { maxChase: 5, drenchFirst: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("tripledive", "diveSpan", pokemon), geometry: "cone", style: "dive",
                color: 0x4FA8D8, label: config && config.plunge === true ? "深潜三连钻" : "三连钻" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["tripledive"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("tripledive", "tempo", context)),
                recover: Math.round(p("tripledive", "recover", context)),
                cooldown: Math.round(p("tripledive", "recharge", context)),
                active: skills["tripledive"].active,
                range: p("tripledive", "diveSpan", context) + 0.3
            };
        },
        windup: function (action, config, prepare) {
            action.present("tripledive:coil", triplediveScene, 1, action.origin(),
                JSON.stringify({ moment: "coil", plunge: config && config.plunge === true }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const body = world.observe(actor);
            const target = action.target();
            if (body === null) { done(action); return; }
            const targetRef = target !== null && world.valid(target) ? String(target.ref()) : "";
            const splash = p("tripledive", "splash", action);
            const soakBonus = Math.max(1, p("tripledive", "soakBonus", action));
            const leap = p("tripledive", "leap", action);
            const span = p("tripledive", "diveSpan", action);
            const radius = p("tripledive", "diveRadius", action);
            const interval = Math.max(2, Math.round(p("tripledive", "interval", action)));
            const drench = Math.max(40, Math.round(p("tripledive", "drenchTicks", action)));
            const splashes = Math.max(6, Math.round(p("tripledive", "splashes", action)));
            const plunge = !!(config && config.plunge === true);
            const scale = Math.max(0.6, Math.min(2.0, radius / 0.55));
            const dives = 3;
            let dive = 0, hits = 0, settled = false;

            function finish(current: CombatAction): void { if (!settled) { settled = true; done(current); } }

            function aimFlat(current: CombatAction, from: CombatPoint): CombatPoint {
                const victim = targetRef === "" ? null : current.world().actor(targetRef);
                const victimBody = victim !== null && current.world().valid(victim) ? current.world().observe(victim) : null;
                const delta = victimBody !== null ? victimBody.position().minus(from) : current.targetPosition().minus(from);
                const flat = WorldCombat.point(delta.x(), 0, delta.z());
                return flat.length() < 1e-6 ? aim(current) : flat.unit();
            }

            function diveNow(current: CombatAction): void {
                const scope = current.world();
                const self = scope.observe(actor);
                if (self === null) { finish(current); return; }
                const at = self.position();
                const forward = aimFlat(current, at);
                const victim = targetRef === "" ? null : scope.actor(targetRef);
                const victimBody = victim !== null && scope.valid(victim) ? scope.observe(victim) : null;
                const wasDrenched = victim !== null && CombatStatus.has(scope, victim, "drenched");
                const power = splash * (wasDrenched ? soakBonus : 1);
                WorldFeedback.emit(scope, triplediveScene, 1, at.plus(WorldCombat.point(0, self.height() * 0.5, 0)),
                    { moment: "dive", direction: [forward.x(), forward.y(), forward.z()], index: dive + 1, dives: dives,
                        soak: wasDrenched ? 1 : 0, splashes: splashes, scale: scale, intensity: Math.max(0.6, Math.min(2.4, power / 15)) }, 18);
                sound(current, "minecraft:item.trident.riptide_1");

                // 钻击按当前与目标的距离判定：目标在钻击距离内就算命中，不依赖空中姿态下的一线扫描，
                // 这样三钻无论起跳多高都能各自结算（每一钻仍要目标在近身范围内）。
                const gap = victimBody === null ? Infinity : at.minus(victimBody.position()).length();
                if (victimBody !== null && gap <= span + radius) {
                    const landed = hurt(current, victim!, "tripledive", power,
                        { damage: damageSpec("tripledive", "splash"), contact: true });
                    if (landed) {
                        hits++;
                        CombatStatus.apply(scope, victim!, "drenched", triplediveDrenched, drench, 0, { unique: true });
                        const point = victimBody.position();
                        WorldFeedback.emit(scope, triplediveScene, 1, point,
                            { moment: "splash", target: String(victim!.ref()), index: dive + 1, dives: dives,
                                soak: wasDrenched ? 1 : 0, splashes: splashes, scale: scale,
                                intensity: Math.max(0.6, Math.min(2.4, power / 15)) }, 22);
                        WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 1.1, 0)),
                            dive === dives - 1 && hits === dives ? triplediveFullText : triplediveSplashText,
                            [dive + 1, hits], 24);
                        scope.sound("minecraft:entity.generic.splash", point, 14, "{}");
                    }
                } else {
                    WorldFeedback.emit(scope, triplediveScene, 1, at.plus(forward.scale(span)),
                        { moment: "miss", index: dive + 1, dives: dives, scale: scale }, 18);
                    WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.1, 0)), triplediveMissText, [dive + 1], 22);
                }
                dive++;
                if (dive >= dives) { finish(current); return; }
                current.after(interval, leapNow);
            }

            function leapNow(current: CombatAction): void {
                const scope = current.world();
                const self = scope.observe(actor);
                if (self === null) { finish(current); return; }
                // 起跳顺带朝目标贴一段：被对手的近身打击顶开后，下一钻仍能追回钻击距离内。
                const victim = targetRef === "" ? null : scope.actor(targetRef);
                const victimBody = victim !== null && scope.valid(victim) ? scope.observe(victim) : null;
                if (victimBody !== null) {
                    const delta = victimBody.position().minus(self.position());
                    const flat = WorldCombat.point(delta.x(), 0, delta.z());
                    const gap = flat.length();
                    const lunge = Math.max(0, Math.min(span * 0.7, gap - span * 0.55));
                    if (lunge > 0.05 && flat.length() > 1e-6) scope.displace(actor, flat.unit().scale(lunge));
                }
                const moving = scope.observe(actor);
                const forward = aimFlat(current, moving === null ? self.position() : moving.position());
                const here = moving === null ? self.position() : moving.position();
                // 起跳只作为表现：三钻的位移交给画面里的水线与水环，施法者本体不推自己，
                // 免得和动作的移动租约打架、把后续的钻击打断。
                WorldFeedback.emit(scope, triplediveScene, 1, here.plus(WorldCombat.point(0, 0.05, 0)),
                    { moment: "leap", direction: [forward.x(), forward.y(), forward.z()], index: dive + 1, dives: dives,
                        leap: leap, rise: Math.max(4, Math.round(leap * 16)), splashes: splashes, scale: scale }, 18);
                sound(current, "minecraft:entity.generic.splash");
                current.after(interval, diveNow);
            }

            sound(action, "minecraft:item.trident.riptide_1");
            WorldFeedback.emit(world, triplediveScene, 1, body.position().plus(WorldCombat.point(0, 0.05, 0)),
                { moment: "coil", dives: dives, splashes: splashes, scale: scale, plunge: plunge ? 1 : 0 }, 20);
            leapNow(action);
        }
    });
}
