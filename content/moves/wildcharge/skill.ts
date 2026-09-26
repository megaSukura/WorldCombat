/**
 * 疯狂伏特 / wildcharge 的出手方式。
 *
 * 核心念头：电流裹身的一次放电冲锋。先把电流从全身收拢、越跑越亮，笔直撞上去；撞实的一刻把电流灌进
 * 对方身体——干燥的目标看概率，湿透的目标被必然传导——回路也顺着自己回来。施法者自己湿透时，起冲的
 * 那一刻就在脚下漏出一小段电弧，这次的漏电更狠。
 * 一句话：猛撞的带电版——同一段直线冲撞，代价与结果都换成了电。
 *
 * 三幕：
 *   起（windup，提交前）：电流从四周收拢、火花向内卷，只播预告表现；顺带把湿身读进预告。
 *   冲（charge → impact / conduct / discharge）：提交后逐刻沿瞄准方向推进；trace 撞上活体即按 surge 结算接触伤害，
 *       再兑现一次传导：目标湿透时必定灌入麻痹，干燥时按 paralyze 概率；命中后原地短放电收势，按 recoil 比例反伤自己。
 *       冲到底、撞墙或推不动都算冲空，积蓄的电流就地（或墙前）泄放，不伤自己。
 *
 * 与同族分开：猛撞干净、无状态；地狱翻滚是抓住再摔；爆炸头突击撞得更长更重还能串人。
 * 疯狂伏特独有的是一身电光与「湿身传导」，玩家凭这道蓝色电弧把它一眼认出来。
 * 配置 overload（过载）由 resolve 改时序射程、由公式改威力/反噬/麻痹概率，提交后才触碰世界。
 */
namespace PokemonSkills {
    const wildchargeScene = "world_combat:move_wildcharge";
    const wildchargeHitText = "world_combat.move.wildcharge.text.hit";
    const wildchargeMissText = "world_combat.move.wildcharge.text.miss";
    const wildchargeRecoilText = "world_combat.move.wildcharge.text.recoil";
    const wildchargeShockText = "world_combat.move.wildcharge.text.shock";
    const wildchargeLeakText = "world_combat.move.wildcharge.text.leak";

    define({
        freeMovement: true,
        id: "wildcharge",
        cooldownParameter: "recharge",
        name: "Wild Charge",
        description: "电流裹身的一次放电冲锋：先把电流收拢到全身，笔直撞上去，把电流灌进对方身体——干燥目标看概率、湿透目标必然传导；回路也会伤到自己，全身湿透时起冲即见漏电、反噬更重。猛撞的带电版。",
        uses: ["用带电冲锋把贴脸的对手撞开", "给一个还没麻痹的主力挂上麻痹", "在湿身的环境里把电流灌进对方身体"],
        kind: "aim",
        range: 3.9,
        maxRange: 6.7,
        prepare: 8,
        active: 28,
        recover: 9,
        cooldown: 34,
        style: "impact",
        defaults: { overload: false, ai: { maxChase: 9, spareParalyzed: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("wildcharge", "radius", pokemon) * 1.7, geometry: "line", style: "electric", color: 0xF2D03A, label: "疯狂伏特" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["wildcharge"], detail: { values: config }, world, actor, attributes };
            return {
                prepare: Math.round(p("wildcharge", "tempo", context)),
                recover: Math.round(p("wildcharge", "aftercast", context)),
                cooldown: Math.round(p("wildcharge", "recharge", context)),
                range: p("wildcharge", "dash", context) + 0.5
            };
        },
        windup: function (action, config, prepare) {
            const body = action.sense().observe(action.actor());
            action.present("world_combat:move_wildcharge:windup", wildchargeScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", overload: !!(config && config.overload), soaked: body !== null && body.wet() ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const movementScenes = WorldFeedback.actionScenes(wildchargeScene);
            const world = action.world();
            const actor = action.actor();
            const selfBody = world.observe(actor);
            const soaked = selfBody !== null && selfBody.wet();
            const length = p("wildcharge", "dash", action);
            const pace = p("wildcharge", "pace", action);
            const radius = p("wildcharge", "radius", action);
            const power = p("wildcharge", "surge", action);
            const recoil = p("wildcharge", "recoil", action);
            const chance = p("wildcharge", "paralyze", action);
            const shove = p("wildcharge", "shove", action);
            const spark = Math.round(p("wildcharge", "spark", action));
            const minimumMove = p("wildcharge", "minimumMove", action);
            const direction = aim(action);
            const scale = radius / 0.5;
            const intensity = Math.max(0.6, Math.min(2.4, power / 90));
            const start = action.origin();
            const end = start.plus(direction.scale(length));
            let travelled = 0;

            sound(action, "minecraft:block.beacon.activate");
            movementScenes.show(action, "charge", start, { moment: "charge", direction: [direction.x(), direction.y(), direction.z()],
                    path: [[start.x(), start.y(), start.z()], [end.x(), end.y(), end.z()]],
                    spark: spark, scale: scale, intensity: intensity, soaked: soaked ? 1 : 0 });
            // 自己湿透的漏电成本在起冲这一刻就明确：脚下漏一小段弧，提示这一趟回路更狠。
            if (soaked) {
                WorldFeedback.emit(world, wildchargeScene, 1, start,
                    { moment: "leak", spark: spark, scale: scale, intensity: intensity }, 22);
                WorldFeedback.text(world, start.plus(WorldCombat.point(0, 1.3, 0)), wildchargeLeakText, [], 22);
            }

            /** 冲空：把积蓄的电流就地（或墙前）泄放，不造成伤害，也不反噬。 */
            function discharge(current: CombatAction, at: CombatPoint | null, blocked: boolean): void {
                const scope = current.world();
                const point = at !== null ? at : current.origin();
                WorldFeedback.emit(scope, wildchargeScene, 1, point,
                    { moment: "discharge", spark: spark, scale: scale, intensity: intensity, blocked: blocked ? 1 : 0 }, 26);
                const body = scope.observe(current.actor());
                WorldFeedback.text(scope, body !== null ? body.position().plus(WorldCombat.point(0, 1.3, 0)) : point, wildchargeMissText, [], 26);
                sound(current, "minecraft:entity.lightning_bolt.impact");
                movementScenes.finish(current, done);
            }

            function advance(current: CombatAction): void {
                const scope = current.world();
                const origin = current.origin();
                const step = Math.min(pace, Math.max(0, length - travelled));
                if (step <= 0.001) { discharge(current, origin, false); return; }
                const delta = direction.scale(step);
                const swept = sweepStep(current, delta, radius);
                const hit = swept.hit;
                if (hit.hitEntity()) {
                    const victim = hit.target();
                    const point = hit.position();
                    const body = victim !== null && scope.valid(victim) ? scope.observe(victim) : null;
                    const already = body !== null && victim !== null && CombatStatus.has(scope, victim, "paralysis");
                    const wet = body !== null && body.wet();
                    const landed = impact(current, hit, "wildcharge", power,
                        { damage: damageSpec("wildcharge", "surge"), contact: true, recoil: recoil });
                    // 一次传导：湿透的目标必然灌入（仍尊重免疫门），干燥的目标按概率掷。
                    const attempted = landed && victim !== null && scope.valid(victim) && !already && (wet || scope.random() < chance);
                    const conducted = attempted && victim !== null && CombatStatus.inflict(scope, victim, "paralysis");
                    const self = scope.observe(actor);
                    const from = self !== null ? self.position() : origin;
                    const path = [[from.x(), from.y(), from.z()], [point.x(), point.y(), point.z()]];
                    const hits = Math.round(12 + spark * 0.7);
                    // 电流沿真实身体走到接触侧；湿目标沿躯体扩散，干燥目标在接触点炸开。
                    WorldFeedback.emit(scope, wildchargeScene, 1, point,
                        { moment: wet ? "conduct" : "impact", target: victim ? String(victim.ref()) : "", spark: spark,
                            scale: scale, intensity: intensity, hits: hits, conducted: conducted ? 1 : 0, path: path }, 30);
                    sound(current, "cobblemon:impact.electric");
                    if (landed && victim !== null && scope.valid(victim)) {
                        scope.hitDisplace(victim, direction.scale(shove));
                        WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 1.3, 0)), wildchargeHitText, [], 26);
                    }
                    // 状态真的灌进去了才报「灌入麻痹」，失败或免疫不再误报。
                    if (conducted) WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 1.55, 0)), wildchargeShockText, [], 24);
                    // 接触后原地短放电收势；反噬伤害仍由共享结算按 recoil 比例落回自己身上。
                    if (self !== null) {
                        WorldFeedback.emit(scope, wildchargeScene, 1, self.position(),
                            { moment: "settle", spark: spark, scale: scale,
                                intensity: Math.max(0.5, Math.min(2.4, power * recoil / 45)), soaked: soaked ? 1 : 0 }, 24);
                        if (landed) WorldFeedback.text(scope, self.position().plus(WorldCombat.point(0, 1.3, 0)), wildchargeRecoilText, [], 24);
                    }
                    movementScenes.finish(current, done);
                    return;
                }
                const moved = swept.moved;
                travelled += moved;
                if (hit.blocked() || moved < minimumMove || travelled >= length) {
                    const blockAt = hit.blocked() ? hit.blockPosition() : null;
                    discharge(current, blockAt !== null ? blockAt : origin, hit.blocked());
                    return;
                }
                movementScenes.show(current, "wake", origin, { moment: "wake", motes: Math.round(3 + spark * 0.12), scale: scale });
                current.after(1, advance);
            }

            advance(action);
        }
    });
}
