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
 *   冲（charge → impact / conduct / contact / discharge）：提交后逐刻沿地平面推进；表现只发当前身体与已走短尾的真实子段，
 *       判定与表现共用同一组端点。trace 撞上活体即以真实首体重算 surge 结算接触伤害，再兑现一次传导：目标湿透时必定灌入麻痹，
 *       干燥时按 paralyze 概率；命中后原地短放电收势，按 recoil 比例反伤自己。伤害或传导被拒、或撞到友方时只在接触处轻接触，不冒充命中。
 *       冲到底、撞墙或推不动都算冲空，积蓄的电流就在真实接触点（或起点）泄放，不伤自己。
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
            // 贴地冲锋：把瞄准方向压成水平，避免竖直分量让身体扫进地面而被挡停。
            const aimed = aim(action);
            const level = WorldCombat.point(aimed.x(), 0, aimed.z());
            const flat = level.length() > 0.001 ? level : WorldCombat.point(action.direction().x(), 0, action.direction().z());
            const direction = flat.length() > 0.001 ? flat.unit() : WorldCombat.point(0, 0, 1);
            // 方向冻结：目标离场后这一冲仍沿提交朝向走完，空放照常放电。
            action.releaseTarget();
            const scale = radius / 0.5;
            const intensity = Math.max(0.6, Math.min(2.4, power / 90));
            const start = action.origin();
            let travelled = 0;

            // 每刻只发当前身体与已走短尾：path 用判定同一段真实子段的两个端点，不再把整段预定路径提前撒满。
            function showStride(current: CombatAction, from: CombatPoint, to: CombatPoint): void {
                movementScenes.show(current, "charge", from,
                    { moment: "charge", direction: [direction.x(), direction.y(), direction.z()],
                        path: [[from.x(), from.y(), from.z()], [to.x(), to.y(), to.z()]],
                        spark: spark, scale: scale, intensity: intensity, soaked: soaked ? 1 : 0 });
            }

            sound(action, "minecraft:block.beacon.activate");
            // 自己湿透的漏电成本在起冲这一刻就明确：脚下漏一小段弧，提示这一趟回路更狠（漏电是泄散警示，真正反噬在命中结算时）。
            if (soaked) {
                WorldFeedback.emit(world, wildchargeScene, 1, start,
                    { moment: "leak", spark: spark, scale: scale, intensity: intensity }, 22);
                WorldFeedback.text(world, start.plus(WorldCombat.point(0, 1.3, 0)), wildchargeLeakText, [], 22);
            }

            /** 冲空：把积蓄的电流就地（或墙前真实接触点）泄放，不造成伤害，也不反噬。 */
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
                // 逐步扫过：只发当前真实子段，端点与判定同源。
                showStride(current, origin, current.origin());
                if (hit.hitEntity()) {
                    const victim = hit.target();
                    const point = hit.position();
                    const body = victim !== null && scope.valid(victim) ? scope.observe(victim) : null;
                    const already = body !== null && victim !== null && CombatStatus.has(scope, victim, "paralysis");
                    const wet = body !== null && body.wet();
                    // 命中时按真实首体重算威力：对方湿身倍率取实际受害者，自己湿身用提交时的快照。
                    let landedPower = power;
                    if (victim !== null) {
                        const hitContext: FactContext = withTarget(factContext(current), victim);
                        hitContext.variables = { "state.wet": soaked };
                        landedPower = Math.max(0, p("wildcharge", "surge", hitContext));
                    }
                    const landed = impact(current, hit, "wildcharge", landedPower,
                        { damage: damageSpec("wildcharge", "surge"), contact: true, recoil: recoil });
                    // 一次传导：湿透的目标必然灌入（仍尊重免疫门），干燥的目标按概率掷。
                    const attempted = landed && victim !== null && scope.valid(victim) && !already && (wet || scope.random() < chance);
                    const conducted = attempted && victim !== null && CombatStatus.inflict(scope, victim, "paralysis");
                    const self = scope.observe(actor);
                    const from = self !== null ? self.position() : origin;
                    const path = [[from.x(), from.y(), from.z()], [point.x(), point.y(), point.z()]];
                    const hits = Math.round(12 + spark * 0.7);
                    if (landed) {
                        // 真实结算成功：真正传导进麻痹才播湿身强导电，否则在接触点炸开。
                        WorldFeedback.emit(scope, wildchargeScene, 1, point,
                            { moment: conducted ? "conduct" : "impact", target: victim ? String(victim.ref()) : "", spark: spark,
                                scale: scale, intensity: intensity, hits: hits, conducted: conducted ? 1 : 0, path: path }, 30);
                        sound(current, "cobblemon:impact.electric");
                    } else {
                        // 友方或伤害被拒：只在接触处轻接触，不冒充命中、不播强导电。
                        WorldFeedback.emit(scope, wildchargeScene, 1, point,
                            { moment: "contact", target: victim ? String(victim.ref()) : "", spark: Math.max(6, Math.round(spark * 0.5)),
                                scale: scale, intensity: Math.max(0.4, intensity * 0.6) }, 16);
                    }
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
                    // 撞墙用真实接触点 hit.position()，不拿方块格坐标 blockPosition()。
                    discharge(current, hit.blocked() ? hit.position() : origin, hit.blocked());
                    return;
                }
                current.after(1, advance);
            }

            advance(action);
        }
    });
}
