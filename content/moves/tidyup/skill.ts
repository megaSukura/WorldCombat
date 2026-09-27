/**
 * 大扫除 / tidyup 的出手方式。
 *
 * 核心念头：原地一次扫开一圈，把身边这片场地里别人留下的陷阱（撒菱、隐形岩、黏黏网、毒菱）连根拔起，
 *   把近处的替身一并扫走；扫完自己轻快起来，攻击与速度各抬一档。它是本族里唯一移走世界里已有东西的一招。
 *
 * 两幕：
 *   起势（windup，提交前）：把扫具拢到身前、压低身形，尘屑在脚边打转；可被打断，不消耗任何东西。
 *   扫（提交后一次完成）：按 sweep 半径扫开——同一片场地里声明为入场陷阱的场地效果整片收走，替身按各自身体
 *     的真实位置收走；只有真正被 dispel 成功的才算清掉（被拒绝的不计入已清）。这一扫瞬时完成，之后只播一段
 *     短促的扬尘回执，不重放没有行为的扫动。随后攻击与速度各抬起（原生 +1），挂上共享身份
 *     world_combat:status/tidyup 的轻快窗口。等级由 boostWindow 拥有并绑在这层轻快载体上。
 *   收（收势）：窗口走完或被清除时，这次抬起的攻与速随窗口收回。
 *
 * 与同族分开：其他三支只是调整自己；大扫除会**改变世界**——把对手花时间布下的陷阱一次抹掉，这也是它最大的价值。
 * 没有可清的敌方布置时它仍然抬攻速，所以也是一支可用的整备招。
 */
namespace PokemonSkills {
    function tidyupScan(radius: number): number { return Math.min(32, Math.max(4, Math.ceil(radius) + 2)); }

    /** 一个可被扫掉的场地陷阱：真实位置、类别，以及是否属于敌方（决定 AI 是否值得拆）。 */
    export interface TidyHazard { id: number; rule: string; position: number[]; foreign: boolean; }

    /**
     * 这片场地里的入场陷阱：只按生产者声明的类别识别，不枚举规则 id，新陷阱自动可扫。
     * 位置与维度由共享查询按真实场地提供；边缘相交的大陷阱整片收走。
     * `foreign` 由陷阱归属者与施法者的关系得出：查不到归属者时按外部威胁处理，不谎报为己方。
     */
    export function tidyupHazardsNear(world: CombatWorld, centre: CombatPoint, radius: number): TidyHazard[] {
        const areas = WorldEffects.hazards(world, centre, radius), result: TidyHazard[] = [];
        for (let index = 0; index < areas.length; index++) {
            const owner = world.actor(areas[index].source);
            result.push({ id: areas[index].id, rule: areas[index].rule, position: areas[index].position,
                foreign: owner === null ? true : !world.friendly(owner) });
        }
        return result;
    }

    /** 一个可被扫掉的替身：真实承载体位置，以及它是否属于敌方。 */
    export interface TidyWard { id: number; position: number[]; foreign: boolean; }

    /**
     * 这片场地里的替身：承载效果挂在主人身上，但每个替身有自己真实的身体位置（状态里的 `point`）。
     * 逐个替身按自己的身体位置过滤，够不到的不算；近处 helper 的远主人不再把所有替身一起纳入。
     */
    export function tidyupWardsNear(world: CombatWorld, centre: CombatPoint, radius: number): TidyWard[] {
        const result: TidyWard[] = [], seen: string[] = [];
        function consider(owner: CombatActor | null): void {
            if (owner === null) return;
            const ref = String(owner.ref());
            if (seen.indexOf(ref) >= 0) return;
            const wards = world.effects(owner, tidyupWard);
            if (!wards.length) return;
            seen.push(ref);
            const foreign = !world.friendly(owner);
            for (let index = 0; index < wards.length; index++) {
                let point: number[] | null = null;
                try {
                    const state = JSON.parse(String(wards[index].data()));
                    if (Array.isArray(state.point) && state.point.length === 3
                        && typeof state.point[0] === "number" && typeof state.point[1] === "number" && typeof state.point[2] === "number")
                        point = [state.point[0], state.point[1], state.point[2]];
                } catch (error) { point = null; }
                if (point === null) continue;
                const dx = point[0] - centre.x(), dz = point[2] - centre.z();
                if (Math.sqrt(dx * dx + dz * dz) > radius) continue;
                result.push({ id: wards[index].id(), position: point, foreign: foreign });
            }
        }
        if (!world.valid(world.source())) return result;
        const actors = world.query(centre, tidyupScan(radius), false);
        for (let index = 0; index < actors.length; index++) {
            consider(actors[index]);
            const owner = world.helperSource(actors[index]);
            if (owner !== null) consider(owner);
        }
        consider(world.source());
        return result;
    }

    define({
        id: tidyupId,
        cooldownParameter: "wait",
        name: "大扫除",
        description: "原地扫开一圈，把身边这片场地里不分敌我的撒菱、隐形岩、黏黏网、毒菱与替身全部扫掉，然后短暂提高自己的攻击和速度。没有陷阱可扫时它仍然抬攻速，所以也是一支可用的整备招。它只清场地陷阱与替身，不会移除天气、别人身上的能力变化或其他持续状态。",
        uses: ["踩进别人布好的陷阱区后一次清干净", "把对手的替身扫走，逼它重新用生命立一个", "开打前顺手把攻与速一起垫起来"],
        kind: "self",
        range: 1,
        maxRange: 1,
        prepare: 8,
        active: 1,
        recover: 5,
        cooldown: 85,
        style: "broom",
        stationary: true,
        defaults: { wide: false, ai: { maxChase: 14, minGap: 2 } },
        fields: [flag("wide", "广扫")],
        indicator: function (config, pokemon) {
            return { radius: p(tidyupId, "sweep", pokemon), geometry: "area", style: "broom", color: 0xF2E9D8,
                label: config && config.wide === true ? "大扫除 · 广扫" : "大扫除" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[tidyupId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(tidyupId, "tempo", context)),
                recover: Math.round(p(tidyupId, "aftercast", context)),
                cooldown: Math.round(p(tidyupId, "wait", context)),
                active: 1,
                range: 1
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_tidyup:draw", tidyupScene, 1, action.origin(),
                JSON.stringify({ moment: "draw", wide: config && config.wide === true ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, _move, _config, done) {
            const world = action.world(), actor = action.actor(), body = world.observe(actor);
            if (body === null) { done(action); return; }
            const rise = Math.max(1, Math.min(2, Math.round(p(tidyupId, "rise", action))));
            const haste = Math.max(1, Math.min(2, Math.round(p(tidyupId, "haste", action))));
            const sweep = Math.max(1.5, p(tidyupId, "sweep", action));
            const window = Math.max(80, Math.round(p(tidyupId, "kit", action)));
            const debris = Math.max(8, Math.round(p(tidyupId, "debris", action)));
            const here = body.position(), scale = sweep / tidyupReference;
            // 只把真正被 dispel 成功的算作已清；被拒绝的请求不计入，也不显示为已清。
            let cleared = 0;
            const hazards = tidyupHazardsNear(world, here, sweep);
            for (let index = 0; index < hazards.length; index++) {
                if (!world.operation(hazards[index].id, "world_combat:dispel", "{}")) continue;
                cleared++;
                // 只有真正被清掉的地点扬起碎屑，位置取该陷阱真实所在。
                WorldFeedback.emit(world, tidyupScene, 1, WorldCombat.point(hazards[index].position[0], hazards[index].position[1], hazards[index].position[2]),
                    { moment: "clear", actor: String(actor.ref()), cleared: 1, sweep: sweep, scale: scale }, 30);
            }
            const wards = tidyupWardsNear(world, here, sweep);
            for (let index = 0; index < wards.length; index++) {
                if (!world.operation(wards[index].id, "world_combat:dispel", "{}")) continue;
                cleared++;
                WorldFeedback.emit(world, tidyupScene, 1, WorldCombat.point(wards[index].position[0], wards[index].position[1], wards[index].position[2]),
                    { moment: "clear", actor: String(actor.ref()), cleared: 1, sweep: sweep, scale: scale }, 30);
            }
            const before = NativeEffects.effectiveStages(world, actor);
            // 轻快载体拥有这份攻/速贡献：刷新先按 previous 结束同招旧窗口，只续上本招自己那一份。
            const previous = MobEffects.read(world, actor, tidyupKit);
            const carrier = MobEffects.apply(world, actor, tidyupKit, window, previous ? previous.amplifier() : 0);
            let windowId = 0, gainedRise = 0, gainedHaste = 0;
            if (carrier) {
                windowId = NativeEffects.boostWindow(world, actor, { atk: rise, spe: haste }, carrier.duration(),
                    tidyupContribution, carrier, previous);
                const raised = NativeEffects.effectiveStages(world, actor);
                gainedRise = Math.max(0, (raised.atk || 0) - (before.atk || 0));
                gainedHaste = Math.max(0, (raised.spe || 0) - (before.spe || 0));
            }
            if (!windowId) MobEffects.consume(world, actor, tidyupKit);
            WorldFeedback.emit(world, tidyupScene, 1, here,
                { moment: "sweep", actor: String(actor.ref()), sweep: sweep, scale: scale, debris: debris,
                    cleared: cleared, intensity: Math.max(0.8, Math.min(2, debris / 30 + cleared / 3)) }, 18);
            WorldFeedback.emit(world, tidyupScene, 1, here,
                { moment: "rise", actor: String(actor.ref()), sweep: sweep, scale: scale,
                    rise: gainedRise, haste: gainedHaste, shine: Math.max(0, (gainedRise + gainedHaste) * 7) }, 30);
            if (windowId)
                // 轻快亮点绑在真正的轻快窗口上，窗口结束或被清除会同步收回。
                WorldFeedback.onEffect(world, windowId, "world_combat:move_tidyup/kit", tidyupScene, 1, here,
                    { moment: "hum", actor: String(actor.ref()), scale: scale });
            WorldFeedback.text(world, here.plus(WorldCombat.point(0, 1.3, 0)),
                cleared > 0 ? tidyupClearText : tidyupText, cleared > 0 ? [cleared, gainedRise, gainedHaste] : [gainedRise, gainedHaste], 32);
            world.sound("minecraft:entity.player.attack.sweep", here, 18, "{}");
            done(action);
        }
    });

    // 轻快窗口走完或被清除：等级由载体窗口自行收回，这里只收尾表现。
    WorldCombat.on("world_combat:move_tidyup/fade", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== tidyupKit) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        // 刷新／替换时旧载体被移除而新载体仍在：不是真的结束。
        if (MobEffects.read(world, actor, tidyupKit)) return;
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.emit(world, tidyupScene, 1, body.position(), { moment: "fade", actor: String(actor.ref()) }, 26);
        WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.3, 0)), tidyupFadeText, [], 24);
    });
}
