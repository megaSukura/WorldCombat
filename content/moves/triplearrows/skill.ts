/**
 * 三连箭 / triplearrows 的出手方式。
 *
 * 核心念头：**一记低扫腿踢开护架，紧接三箭同时离弦**——腿不是用来伤人的，是用来让对手的护架空出来；
 * 三支箭一起走，被这一脚真正踢开的那一下会被钉在要害上（暴击），箭势重时还会把人压得开不了手（畏缩）。
 *
 * 两拍：
 *   起（windup，提交前）：压低身子、箭尾聚光。
 *   一击（kick）：提交后朝方向点或选中目标的方向扫出一腿。腿只够到 `reach` 那点近身长度，**不随目标离得多远拉长**：
 *       近处踢中活物才结算一次小接触伤害，并按踢开几率压一级防御、挂共享身份 `world_combat:status/guardbroken`。
 *       只有被这一脚真正踢中的那个目标，本轮三箭才会钉在要害上；远处只收箭伤，不虚构腿伤。
 *   二击（volley）：隔 `drawTicks` 同时射出 3 支箭（外观是真的箭，每条箭迹各自跟随自己的投射物）。每支箭命中结算
 *       一段 `volley`；第一次命中时掷一次畏缩，中了就把目标压住（共享身份 `world_combat:status/flinch` + `world_combat:interrupt`）。
 *
 * 选取：kind 为 aim——方向点或实体都能放，远距离可以直接三箭；箭会被墙挡住，腿够不到就不会有腿伤。
 *
 * 与同族分开：同是「一击留痕、降防御」，撕裂爪是踏前交叉撕、铁尾是慢而重的下砸、暗影之骨是远程骨投、
 * 碎岩是贴脸连点、雷鸣蹴击是绕步踢；三连箭是**腿技开路 + 三箭齐发**，破防只是给箭让路，箭才是主角——
 * 也是全族唯一能在中距离同时照顾几个目标（扇形齐射）的一招。
 *
 * 配置 `fan`（扇形齐射）由公式改散布与单支威力：开启＝散开打几个，关闭＝集中打一个。
 */
namespace PokemonSkills {
    const triplearrowsScene = "world_combat:move_triplearrows";
    const triplearrowsGuard = "world_combat:triplearrows_guard";
    const triplearrowsFlinch = "world_combat:triplearrows_flinch";
    const triplearrowsGuardText = "world_combat.move.triplearrows.text.guard";
    const triplearrowsFlinchText = "world_combat.move.triplearrows.text.flinch";

    define({
        id: "triplearrows",
        name: "Triple Arrows",
        description: "先朝方向点或选中目标扫出一记近身低腿踢开护架，再同时射出 3 支箭：三箭可以打同一个目标，也可以扇形散开照顾几个。腿只够到近身一点，远距离不会凭空踢中，只送三箭；被这一脚真正踢开护架的目标会被钉在要害上，箭势重时把目标压得开不了手。",
        uses: ["腿技踢开护架后三箭齐发", "扇形齐射同时照顾挤在一起的目标", "中距离单体高暴击连射"],
        kind: "aim",
        range: 3.4,
        maxRange: 16,
        prepare: 8,
        active: 34,
        recover: 9,
        cooldown: 36,
        style: "shot",
        defaults: { fan: false, ai: { maxChase: 6, chipFirst: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("triplearrows", "spread", pokemon), geometry: "cone", style: "shot",
                color: 0x9AA86A, label: config && config.fan === true ? "扇形三连箭" : "集中三连箭" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            var context: NumberContext = { pokemon: pokemon, skill: skills["triplearrows"], detail: { values: config }, world: world || null, actor: actor || null, attributes: attributes };
            var fan = !!(config && config.fan);
            return {
                prepare: p("triplearrows", "prepare", context),
                recover: p("triplearrows", "recover", context),
                cooldown: p("triplearrows", "cooldown", context) + (fan ? 6 : 0),
                active: skills["triplearrows"].active,
                range: p("triplearrows", "arrowRange", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_triplearrows:windup", triplearrowsScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", fan: config && config.fan === true }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const selected = action.target();
            const targetRef = selected !== null && world.valid(selected) ? String(selected.ref()) : "";
            const kickPower = p("triplearrows", "kick", action);
            const volleyPower = p("triplearrows", "volley", action);
            const spread = p("triplearrows", "spread", action);
            const drawTicks = Math.max(3, Math.round(p("triplearrows", "drawTicks", action)));
            const guardChance = p("triplearrows", "guardChance", action);
            const guardStages = Math.max(1, Math.round(p("triplearrows", "guardStages", action)));
            const guardTicks = Math.max(40, Math.round(p("triplearrows", "guardTicks", action)));
            const flinchChance = p("triplearrows", "flinchChance", action);
            const flinchTicks = Math.max(1, Math.round(p("triplearrows", "flinchTicks", action)));
            const arrowSpeed = p("triplearrows", "arrowSpeed", action);
            const arrowRange = p("triplearrows", "arrowRange", action);
            const kickReach = p("triplearrows", "reach", action);
            const kickRadius = p("triplearrows", "kickRadius", action);
            const arrowRadius = p("triplearrows", "arrowRadius", action);
            const arrows = 3;
            const intensity = Math.max(0.5, Math.min(2.2, volleyPower / 32));
            let opened = false, openedRef = "", settled = false, flinchRolled = false;

            function finish(current: CombatAction): void { if (!settled) { settled = true; done(current); } }

            // 一拍：只够到近身一点的低扫腿；踢中谁，谁的护架才可能开。
            const me = world.observe(action.actor());
            const aimPoint = action.targetPosition();
            const delta = me !== null ? WorldCombat.point(aimPoint.x() - me.position().x(), 0, aimPoint.z() - me.position().z()) : WorldCombat.point(0, 0, 1);
            const forward = delta.length() < 1e-6 ? aim(action) : delta.unit();
            const from = me !== null ? me.position() : action.origin();
            const kickEnd = from.plus(forward.scale(kickReach));
            const kick = action.trace(from, kickEnd, kickRadius);
            sound(action, "minecraft:entity.player.attack.sweep");
            if (kick.hitEntity()) {
                const victim = kick.target(), point = kick.position();
                const landed = impact(action, kick, "triplearrows", kickPower,
                    { damage: damageSpec("triplearrows", "kick"), contact: true }, "kick");
                WorldFeedback.emit(world, triplearrowsScene, 1, point,
                    { moment: "kick", target: victim !== null ? String(victim.ref()) : "", reach: kickReach,
                        point: [point.x(), point.y(), point.z()],
                        path: [[from.x(), from.y(), from.z()], [point.x(), point.y(), point.z()]], intensity: intensity }, 22);
                if (landed && victim !== null && world.valid(victim)) {
                    opened = world.random() < guardChance;
                    if (opened) {
                        openedRef = String(victim.ref());
                        NativeEffects.boost(world, victim, "def", -guardStages);
                        MobEffects.apply(world, victim, triplearrowsGuard, guardTicks, 0);
                        WorldFeedback.emit(world, triplearrowsScene, 1, point,
                            { moment: "guard", target: openedRef, stages: guardStages }, 22);
                        WorldFeedback.text(world, point.plus(WorldCombat.point(0, 1.1, 0)), triplearrowsGuardText, [guardStages], 26);
                    }
                    sound(action, "cobblemon:impact.fighting");
                }
            } else {
                // 腿够不到就只是在脚前短区扫过，不做成远处的腿伤。
                WorldFeedback.emit(world, triplearrowsScene, 1, from,
                    { moment: "kick", target: "", reach: kickReach, direction: [forward.x(), 0, forward.z()],
                        point: [kickEnd.x(), kickEnd.y(), kickEnd.z()],
                        path: [[from.x(), from.y(), from.z()], [kickEnd.x(), kickEnd.y(), kickEnd.z()]], intensity: intensity }, 20);
            }

            /** 二拍：三箭齐发。每支箭第一次命中时掷一次畏缩（与原生一次判定一致）。 */
            function fireVolley(current: CombatAction): void {
                const scope = current.world(), body = scope.observe(current.actor());
                const targetActor = targetRef === "" ? null : scope.actor(targetRef);
                const targetBody = targetActor !== null && scope.valid(targetActor) ? scope.observe(targetActor) : null;
                const origin = body !== null ? body.position().plus(WorldCombat.point(0, 0.6, 0)) : current.origin().plus(WorldCombat.point(0, 0.6, 0));
                let base = targetBody !== null && body !== null
                    ? WorldCombat.point(targetBody.position().x() - body.position().x(), 0, targetBody.position().z() - body.position().z())
                    : WorldCombat.point(current.direction().x(), 0, current.direction().z());
                if (base.length() < 1e-6) base = WorldCombat.point(0, 0, 1);
                base = base.unit();
                sound(current, "minecraft:entity.arrow.shoot");
                let pending = arrows;
                for (let index = 0; index < arrows; index++) {
                    const offset = (index - 1) * spread * Math.PI / 180;
                    const cos = Math.cos(offset), sin = Math.sin(offset);
                    const direction = WorldCombat.point(base.x() * cos - base.z() * sin, 0, base.x() * sin + base.z() * cos);
                    const flight = current.projectile(origin, direction.scale(arrowSpeed), 0.02, arrowRadius, arrowRange, 80,
                        function (inner, hit) { landed(inner, hit); },
                        function (inner) { if (--pending <= 0) finish(inner); },
                        JSON.stringify({ item: "minecraft:arrow", glow: true, scale: 1 }));
                    WorldFeedback.keep(scope, "triplearrows:shot:" + String(action.id()) + ":" + index, triplearrowsScene, 1, origin,
                        { moment: "volley", projectile: flight, index: index, arrows: arrows,
                            direction: [direction.x(), direction.y(), direction.z()], spread: spread, intensity: intensity }, 90);
                }
            }

            function landed(current: CombatAction, hit: CombatImpact): void {
                const scope = current.world(), victim = hit.target();
                if (victim === null || scope.friendly(victim)) return;
                const features: any = { damage: damageSpec("triplearrows", "volley"), contact: false };
                if (opened && openedRef !== "" && String(victim.ref()) === openedRef) features.critical = true;
                const result = impact(current, hit, "triplearrows", volleyPower, features, "volley");
                const point = hit.position();
                WorldFeedback.emit(scope, triplearrowsScene, 1, point,
                    { moment: "hit", target: String(victim.ref()), arrows: arrows, spread: spread,
                        crit: opened && String(victim.ref()) === openedRef ? 1 : 0, intensity: intensity }, 22);
                sound(current, "minecraft:entity.arrow.hit");
                if (!result || !scope.valid(victim)) return;
                // 一次施放只在第一支真正命中的箭上掷一次畏缩（与原生「一次判定」一致）。
                if (flinchRolled) return;
                flinchRolled = true;
                if (scope.random() >= flinchChance) return;
                if (MobEffects.apply(scope, victim, triplearrowsFlinch, flinchTicks, 0) === null) return;
                scope.deliver(victim, "world_combat:interrupt");
                WorldFeedback.emit(scope, triplearrowsScene, 1, point, { moment: "flinch", target: String(victim.ref()) }, 22);
                WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 1.1, 0)), triplearrowsFlinchText, [], 24);
            }

            action.after(drawTicks, fireVolley);
        }
    });

}
