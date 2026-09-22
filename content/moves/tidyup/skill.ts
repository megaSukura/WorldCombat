/**
 * 大扫除 / tidyup 的出手方式。
 *
 * 核心念头：原地扫开一圈，把身边这片场地里别人留下的陷阱（撒菱、隐形岩、黏黏网、毒菱）连根拔起，
 *   把近处的替身一并扫走；扫完自己轻快起来，攻击与速度各抬一档。它是本族里唯一移走世界里已有东西的一招。
 *
 * 三幕：
 *   起势（windup，提交前）：把扫具拢到身前、压低身形，尘屑在脚边打转；可被打断，不消耗任何东西。
 *   扫（提交后）：按 sweep 半径扫开——同一片场地里四条陷阱规则的场地效果整片收走，替身按承载效果结束；
 *     随后攻击与速度各抬起（原生 +1），挂上共享身份 world_combat:status/tidyup 的轻快窗口，
 *     并另存一枚只记窗口 id 的记号，供窗口结束时按 id 提前结束。
 *   收（收势）：扬起的一圈尘落下，浮出结果；窗口走完或被清除时，这次抬起的攻与速随窗口收回。
 *
 * 与同族分开：其他三支只是调整自己；大扫除会**改变世界**——把对手花时间布下的陷阱一次抹掉，这也是它最大的价值。
 * 没有陷阱可扫时它仍然抬攻速，所以也是一支可用的整备招。
 */
namespace PokemonSkills {
    // 记号：只记这次轻快窗口的 id；窗口结束时按 id 提前结束它（已自然到期则无事发生）。等级账在窗口自己身上。
    WorldCombat.effect(tidyupMark, 1, 1200, "actor", function (json) {
        const value = JSON.parse(json);
        if (typeof value.window !== "number" || !isFinite(value.window)) throw new Error("Invalid tidy up mark");
        return JSON.stringify(value);
    }, EffectProtocols.unchanged);
    WorldCombat.effectHandler(tidyupMark, "start", function () { });

    /** 公共能力阶梯：宝可梦读原生等级，其他战斗者读同一套等级落在属性上的载体。 */
    function tidyupStage(world: CombatWorld, actor: CombatActor, stat: string): number {
        return String(actor.domain()) === "cobblemon"
            ? NativeEffects.stage(NativeEffects.read(world, actor), stat)
            : CombatStages.stage(world, actor, stat);
    }
    function tidyupScan(radius: number): number { return Math.min(32, Math.max(4, Math.ceil(radius) + 2)); }

    /**
     * 这片场地里的入场陷阱：只按生产者声明的类别识别，不枚举规则 id，新陷阱自动可扫。
     * 位置与维度由共享查询按真实场地提供。
     */
    export function tidyupHazardsNear(world: CombatWorld, centre: CombatPoint, radius: number): { id: number; rule: string }[] {
        const areas = WorldEffects.hazards(world, centre, radius), result: { id: number; rule: string }[] = [];
        for (let index = 0; index < areas.length; index++) result.push({ id: areas[index].id, rule: areas[index].rule });
        return result;
    }

    /** 这片场地里的替身：承载效果挂在主人身上，替身身体半径内或主人半径内部的都算。 */
    export function tidyupWardsNear(world: CombatWorld, centre: CombatPoint, radius: number): number[] {
        const result: number[] = [], seen: string[] = [];
        function consider(owner: CombatActor | null): void {
            if (owner === null) return;
            const ref = String(owner.ref());
            if (seen.indexOf(ref) >= 0) return;
            const wards = world.effects(owner, tidyupWard);
            if (!wards.length) return;
            seen.push(ref);
            for (let index = 0; index < wards.length; index++) result.push(wards[index].id());
        }
        if (!world.valid(world.source())) return result;
        const actors = world.query(centre, tidyupScan(radius), false);
        for (let index = 0; index < actors.length; index++) {
            const actor = actors[index], body = world.observe(actor);
            if (body === null || body.position().minus(centre).length() > radius) continue;
            consider(actor);
            const owner = world.helperSource(actor);
            if (owner !== null) consider(owner);
        }
        consider(world.source());
        return result;
    }

    define({
        id: tidyupId,
        name: "大扫除",
        description: "扫掉撒菱、隐形岩、黏黏网、毒菱与替身，并提高自己的攻击和速度。",
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
            const sweeps = Math.max(2, Math.round(p(tidyupId, "sweeps", action)));
            const debris = Math.max(8, Math.round(p(tidyupId, "debris", action)));
            const here = body.position(), scale = sweep / tidyupReference;
            const hazards = tidyupHazardsNear(world, here, sweep);
            for (let index = 0; index < hazards.length; index++) world.operation(hazards[index].id, "world_combat:dispel", "{}");
            const wards = tidyupWardsNear(world, here, sweep);
            for (let index = 0; index < wards.length; index++) world.operation(wards[index], "world_combat:dispel", "{}");
            const cleared = hazards.length + wards.length;
            const beforeAtk = tidyupStage(world, actor, "atk"), beforeSpe = tidyupStage(world, actor, "spe");
            const windowId = NativeEffects.boostWindow(world, actor, { atk: rise, spe: haste }, window, "tidyup");
            const gainedRise = Math.max(0, tidyupStage(world, actor, "atk") - beforeAtk);
            const gainedHaste = Math.max(0, tidyupStage(world, actor, "spe") - beforeSpe);
            MobEffects.apply(world, actor, tidyupKit, window, Math.max(gainedRise, gainedHaste));
            world.effect(tidyupMark, actor, JSON.stringify({ window: windowId }), window);
            WorldFeedback.emit(world, tidyupScene, 1, here,
                { moment: "sweep", actor: String(actor.ref()), sweep: sweep, scale: scale, sweeps: sweeps, debris: debris,
                    cleared: cleared, intensity: Math.max(0.8, Math.min(2, debris / 30 + cleared / 3)) }, 34);
            if (cleared > 0)
                WorldFeedback.emit(world, tidyupScene, 1, here,
                    { moment: "clear", actor: String(actor.ref()), cleared: cleared, sweep: sweep, scale: scale }, 30);
            WorldFeedback.emit(world, tidyupScene, 1, here,
                { moment: "rise", actor: String(actor.ref()), sweep: sweep, scale: scale,
                    rise: gainedRise, haste: gainedHaste, shine: Math.max(6, (gainedRise + gainedHaste) * 7) }, 30);
            WorldFeedback.keep(world, "tidyup:kit:" + String(actor.ref()), tidyupScene, 1, here,
                { moment: "hum", actor: String(actor.ref()), scale: scale }, Math.min(window, 150));
            WorldFeedback.text(world, here.plus(WorldCombat.point(0, 1.3, 0)),
                cleared > 0 ? tidyupClearText : tidyupText, cleared > 0 ? [cleared, gainedRise, gainedHaste] : [gainedRise, gainedHaste], 32);
            world.sound("minecraft:entity.player.attack.sweep", here, 18, "{}");
            done(action);
        }
    });

    // 轻快窗口走完或被清除：按记号把这次抬起的攻与速原样收回（只收到各自当前实际持有的正等级）。
    WorldCombat.on("world_combat:move_tidyup/fade", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== tidyupKit) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        const marks = world.effects(actor, tidyupMark);
        if (marks.length) {
            const mark = JSON.parse(String(marks[0].data()));
            if (typeof mark.window === "number") NativeEffects.windowClose(world, mark.window);
            world.operation(marks[0].id(), "world_combat:dispel", "{}");
        }
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.emit(world, tidyupScene, 1, body.position(), { moment: "fade", actor: String(actor.ref()) }, 26);
        WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.3, 0)), tidyupFadeText, [], 24);
    });
}
