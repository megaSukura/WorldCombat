/**
 * 聚气 / focusenergy —— 执行组织。
 *
 * 核心念头：深深地吸一口气，把心神收成一点；这口气**随呼吸越沉越深**，期间自己每一次命中都多一点找到破绽的机会，
 *   命中不消耗它，直到窗口走完才散。它是这一族里唯一「越久越深、可反复兑现」的一招，与磨砺的「下一次必中要害、用掉即散」相反。
 *
 * 两幕：
 *   吸（windup 播「吸气」，提交前只观察与预告，打断不花代价）。
 *   聚（提交后）：挂上共享身份 world_combat:status/focusenergy 的吐纳窗口（本单元效果 world_combat:focus_breath），
 *     并把满气附加概率、深化时长、起始刻与表现数写进 world_combat:focusenergy_mark。
 * 兑现：带身份者的每一次伤害结算，按已聚气的时间线性抬升附加要害概率（PokemonDamage.metadata 在结算前读取 mark）。
 * 持：效果存续期每 20 刻在自己身上续一层越来越亮/越大的静念，读 mark 算出当前已深化比例。
 * 散：窗口走完，一口气呼出，静念散开；mark 一并收回。
 * 互斥：身上已有龙声鼓舞时聚气不成立（原生同一份 volatile 不能并存），由 ready 拒绝，不花 PP。
 */
namespace PokemonSkills {
    /** 表现里的参考半径：`data.scale = 实际静念半径 / 这个数`。 */
    const focusEnergyReferenceRadius = 1.4;

    function focusEnergyAbove(point: CombatPoint): CombatPoint { return point.plus(WorldCombat.point(0, 1.25, 0)); }

    WorldCombat.effect(focusEnergyMark, 1, 1200, "actor", function (json) {
        const value = JSON.parse(json || "{}");
        ["chance", "ramp", "start", "motes", "breaths"].forEach(function (key) {
            if (typeof value[key] !== "number" || !isFinite(value[key])) throw new Error("Invalid focusenergy mark: " + key);
        });
        if (value.chance < 0 || value.chance > 1 || value.ramp < 1) throw new Error("Invalid focusenergy mark range");
        return JSON.stringify(value);
    }, EffectProtocols.unchanged);
    WorldCombat.effectHandler(focusEnergyMark, "start", function () { });
    WorldCombat.effectHandler(focusEnergyMark, "operation:world_combat:dispel", function (effect) { effect.end(); });

    function focusEnergyMarkOf(world: CombatWorld, actor: CombatActor): any {
        const views = world.effects(actor, focusEnergyMark);
        return views.length ? JSON.parse(String(views[0].data())) : null;
    }
    function focusEnergyReleaseMark(world: CombatWorld, actor: CombatActor): void {
        const views = world.effects(actor, focusEnergyMark);
        if (views.length) world.operation(views[0].id(), "world_combat:dispel", "{}");
    }
    /** 已深化比例：0 是刚张口，1 是满气。 */
    function focusEnergyRatio(world: CombatWorld, mark: any): number {
        if (mark === null) return 0;
        const elapsed = Math.max(0, world.tick() - Number(mark.start));
        return Math.max(0, Math.min(1, elapsed / Math.max(1, Number(mark.ramp))));
    }

    // 兑现点：带吐纳身份者的伤害结算按已深化比例抬升附加要害概率。真正改骰子放在结算前，预览只看不改；
    // 已有暴击或被防暴击压成 0（criticalChance === 0）时不覆盖。抬升按「独立的第二次机会」实现，
    // 与磨砺的强制要害、幸运咒语的抚平走同一份共享结算，互不绕过。
    PokemonDamage.metadata.define({
        id: "world_combat:move_focusenergy/edge",
        applies: function (context) { return !context.preview && !!context.world && !!context.actor; },
        apply: function (context) {
            const data: any = context.metadata, world = <CombatWorld>context.world, actor = <CombatActor>context.actor;
            if (data.category !== "physical" && data.category !== "special") return;
            if (data.critical === true) return;
            const base = typeof data.criticalChance === "number" && isFinite(data.criticalChance) ? data.criticalChance : 0;
            if (!(base >= 0) || base >= 1) return;
            if (!CombatStatus.has(world, actor, focusEnergyStatus)) return;
            const mark = focusEnergyMarkOf(world, actor);
            if (mark === null) return;
            const extra = Math.max(0, Math.min(0.95, Number(mark.chance) * focusEnergyRatio(world, mark)));
            if (!(extra > 0)) return;
            const target = 1 - (1 - base) * (1 - extra);
            if (!(target > base)) return;
            data.criticalChance = target;
            if (world.random() < (target - base) / (1 - base)) data.critical = true;
        }
    });

    // 持：每 20 刻续一层静念，越深越亮越大；数量沿用本招算出的静念数与呼吸圈数。
    WorldCombat.on("world_combat:move_focusenergy/deepen", "world_combat:mob_effect_tick", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== focusEnergyEffect || event.world().tick() % 20 !== 0) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor) || MobEffects.read(world, actor, focusEnergyEffect) === null) return;
        const body = world.observe(actor);
        if (body === null) return;
        const mark = focusEnergyMarkOf(world, actor);
        const ratio = focusEnergyRatio(world, mark);
        const motes = mark ? Math.max(8, Math.round(Number(mark.motes) || 20)) : 20;
        const breaths = mark ? Math.max(2, Math.round(Number(mark.breaths) || 2)) : 2;
        WorldFeedback.keep(world, "world_combat:move_focusenergy/deepen/" + String(actor.ref()), focusEnergyScene, 1, body.position(),
            { moment: "deepen", target: String(actor.ref()), motes: motes, breaths: breaths,
                ratio: Math.round(ratio * 100) / 100, scale: 0.7 + ratio * 0.9, intensity: 0.8 + ratio * 0.8 }, 40);
    });

    // 散：窗口走完或被清除时收回 mark；自然走完时播一次散开。
    WorldCombat.on("world_combat:move_focusenergy/fade", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== focusEnergyEffect) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        focusEnergyReleaseMark(world, actor);
        if (String(data.cause) !== "expired") return;
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.emit(world, focusEnergyScene, 1, body.position(), { moment: "fade", target: String(actor.ref()) }, 22);
        WorldFeedback.text(world, focusEnergyAbove(body.position()), focusEnergyFadeText, [], 22);
    });

    define({
        id: focusEnergyId,
        cooldownParameter: "wait",
        name: "聚气",
        description: "深深吸一口气，把心神收成一点：这口气随时间越沉越深，期间自己的每一次命中都更容易击中要害，命中不会消耗它，直到窗口走完才散。身上已有龙声鼓舞时无法再聚气。",
        uses: ["开场先吸一口气，让后面每一击都更容易命中要害", "在对手硬吃连击前把破绽看准", "逼对手在吐纳走完前不敢贴身"],
        kind: "self",
        range: 1,
        maxRange: 1,
        prepare: 7,
        active: 1,
        recover: 4,
        cooldown: 90,
        style: "breath",
        stationary: true,
        defaults: { deep: false, ai: { maxChase: 14, minGap: 2 } },
        fields: [flag("deep", "深呼吸")],
        indicator: function (config, pokemon) {
            return { radius: pokemon ? p(focusEnergyId, "ripple", pokemon) : 1.4, geometry: "area", style: "breath",
                color: 0x9FD8FF, label: config && config.deep === true ? "聚气 · 深呼吸" : "聚气 · 浅呼吸" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[focusEnergyId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(focusEnergyId, "tempo", context)),
                recover: Math.round(p(focusEnergyId, "aftercast", context)),
                cooldown: Math.round(p(focusEnergyId, "wait", context)),
                active: 1,
                range: 1
            };
        },
        ready: function (action, _config) {
            // 原生：focusenergy 与 dragoncheer 同一份 volatile 不能并存；已有鼓舞时聚气不成立。
            if (CombatStatus.has(action.sense(), action.actor(), "dragoncheer")) return "already-cheered";
            return "";
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_focusenergy:inhale", focusEnergyScene, 1, action.origin(),
                JSON.stringify({ moment: "inhale", deep: config && config.deep === true ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, _move, config, done) {
            const world = action.world(), actor = action.actor(), body = world.observe(actor);
            if (body === null) { done(action); return; }
            const deep = !!(config && config.deep === true);
            const chance = Math.max(0.1, Math.min(0.95, p(focusEnergyId, "edge", action)));
            const ramp = Math.max(20, Math.round(p(focusEnergyId, "ramp", action)));
            const window = Math.max(80, Math.round(p(focusEnergyId, "grasp", action)));
            const motes = Math.max(8, Math.round(p(focusEnergyId, "motes", action)));
            const breaths = Math.max(2, Math.min(4, Math.round(p(focusEnergyId, "breaths", action))));
            const ripple = Math.max(0.5, p(focusEnergyId, "ripple", action));
            const scale = ripple / focusEnergyReferenceRadius;
            const feet = body.position().plus(WorldCombat.point(0, -body.height() / 2, 0));
            MobEffects.apply(world, actor, focusEnergyEffect, window, 0);
            focusEnergyReleaseMark(world, actor);
            world.effect(focusEnergyMark, actor,
                JSON.stringify({ chance: chance, ramp: ramp, start: world.tick(), motes: motes, breaths: breaths }), window);
            WorldFeedback.emit(world, focusEnergyScene, 1, feet,
                { moment: "settle", target: String(actor.ref()), motes: motes, breaths: breaths, ratio: 0, deep: deep ? 1 : 0,
                    scale: scale, intensity: Math.max(0.8, Math.min(1.8, chance / 0.4)) }, 34);
            WorldFeedback.keep(world, "world_combat:move_focusenergy/deepen/" + String(actor.ref()), focusEnergyScene, 1, body.position(),
                { moment: "deepen", target: String(actor.ref()), motes: motes, breaths: breaths, ratio: 0, scale: 0.7, intensity: 0.8 }, Math.min(window, 1600));
            WorldFeedback.text(world, focusEnergyAbove(body.position()), deep ? focusEnergyDeepText : focusEnergyReadyText,
                [Math.round(window / 20), Math.round(chance * 100)], 32);
            world.sound("minecraft:entity.breeze.inhale", body.position(), 14, "{}");
            world.sound("minecraft:block.beacon.activate", body.position(), 12, "{}");
            done(action);
        }
    });
}
