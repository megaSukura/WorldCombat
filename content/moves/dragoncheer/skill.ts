/**
 * 龙声鼓舞 / dragoncheer —— 执行组织。
 *
 * 核心念头：一声龙吟般的鼓舞压过战场——施法者从胸腔里吼出这道声浪，沿地面推成一圈圈光波，罩住半径内
 *   所有友方（含自己）；他们因此更容易找到破绽，龙属性的友方被激得最狠。它是这一族里唯一成片施于队友的一招。
 *
 * 两幕：
 *   蓄（windup 播「蓄声」，提交前只观察与预告，打断不花代价）。
 *   吼（提交后）：以自身为中心推开声浪，给半径内每个友方挂共享身份 world_combat:status/dragoncheer 的士气窗口
 *     （本单元效果 world_combat:dragon_cheer），并把附加概率、光点数与是否龙属性写进各自的 world_combat:dragoncheer_mark。
 * 兑现：带身份者的每一次伤害结算，按 mark 的附加概率抬升要害机会（PokemonDamage.metadata 在结算前读取 mark）。
 * 持：每个受鼓舞者自己的效果每 20 刻续一层低密度光环（各自读自己的 mark）。
 * 散：士气到期或被清除时收回 mark；自然走完时轻轻散去。
 * 互斥：已聚气（focusenergy）的友方不吃鼓舞（原生同一份 volatile 不能并存），跳过他们。
 */
namespace PokemonSkills {
    /** 表现里的参考半径：`data.scale = 实际鼓舞半径 / 这个数`。 */
    const dragonCheerReferenceRadius = 4;

    function dragoncheerAbove(point: CombatPoint): CombatPoint { return point.plus(WorldCombat.point(0, 1.25, 0)); }

    WorldCombat.effect(dragonCheerMark, 1, 1200, "actor", function (json) {
        const value = JSON.parse(json || "{}");
        ["chance", "motes", "dragon"].forEach(function (key) {
            if (typeof value[key] !== "number" || !isFinite(value[key])) throw new Error("Invalid dragoncheer mark: " + key);
        });
        if (value.chance < 0 || value.chance > 1) throw new Error("Invalid dragoncheer mark range");
        return JSON.stringify(value);
    }, EffectProtocols.unchanged);
    WorldCombat.effectHandler(dragonCheerMark, "start", function () { });
    WorldCombat.effectHandler(dragonCheerMark, "operation:world_combat:dispel", function (effect) { effect.end(); });

    function dragoncheerMarkOf(world: CombatWorld, actor: CombatActor): any {
        const views = world.effects(actor, dragonCheerMark);
        return views.length ? JSON.parse(String(views[0].data())) : null;
    }
    function dragoncheerReleaseMark(world: CombatWorld, actor: CombatActor): void {
        const views = world.effects(actor, dragonCheerMark);
        if (views.length) world.operation(views[0].id(), "world_combat:dispel", "{}");
    }
    /** 是否龙属性：宝可梦读其当前属性，其他生物没有这个概念，按非龙属性处理。 */
    function dragoncheerIsDragon(world: CombatWorld, actor: CombatActor): boolean {
        return PokemonDamage.combatants.read(world, actor).types.indexOf("dragon") >= 0;
    }

    // 兑现点：带士气身份者的伤害结算按 mark 的附加概率抬升要害机会。已有暴击或被防暴击压成 0 时不覆盖；
    // 与聚气、磨砺、幸运咒语走同一份共享结算。抬升按「独立的第二次机会」实现。
    PokemonDamage.metadata.define({
        id: "world_combat:move_dragoncheer/edge",
        applies: function (context) { return !context.preview && !!context.world && !!context.actor; },
        apply: function (context) {
            const data: any = context.metadata, world = <CombatWorld>context.world, actor = <CombatActor>context.actor;
            if (data.category !== "physical" && data.category !== "special") return;
            if (data.critical === true) return;
            const base = typeof data.criticalChance === "number" && isFinite(data.criticalChance) ? data.criticalChance : 0;
            if (!(base >= 0) || base >= 1) return;
            if (!CombatStatus.has(world, actor, dragonCheerStatus)) return;
            const mark = dragoncheerMarkOf(world, actor);
            if (mark === null) return;
            const extra = Math.max(0, Math.min(0.95, Number(mark.chance)));
            if (!(extra > 0)) return;
            const target = 1 - (1 - base) * (1 - extra);
            if (!(target > base)) return;
            data.criticalChance = target;
            if (world.random() < (target - base) / (1 - base)) data.critical = true;
        }
    });

    // 持：受鼓舞者自己的士气每 20 刻续一层低密度光环，数量读自己的 mark，龙属性档更亮。
    WorldCombat.on("world_combat:move_dragoncheer/rally", "world_combat:mob_effect_tick", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== dragonCheerEffect || event.world().tick() % 20 !== 0) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor) || MobEffects.read(world, actor, dragonCheerEffect) === null) return;
        const body = world.observe(actor);
        if (body === null) return;
        const mark = dragoncheerMarkOf(world, actor);
        const motes = mark ? Math.max(8, Math.round(Number(mark.motes) || 24)) : 24;
        const dragon = mark && Number(mark.dragon) >= 1 ? 1 : 0;
        WorldFeedback.keep(world, "world_combat:move_dragoncheer/rally/" + String(actor.ref()), dragonCheerScene, 1, body.position(),
            { moment: "rally", target: String(actor.ref()), motes: motes, dragon: dragon,
                scale: dragon ? 1.25 : 1, intensity: dragon ? 1.2 : 1 }, 40);
    });

    // 散：士气到期或被清除时收回 mark；自然走完时轻轻散去。
    WorldCombat.on("world_combat:move_dragoncheer/fade", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== dragonCheerEffect) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        dragoncheerReleaseMark(world, actor);
        if (String(data.cause) !== "expired") return;
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.emit(world, dragonCheerScene, 1, body.position(),
            { moment: "fade", target: String(actor.ref()), dragon: dragoncheerIsDragon(world, actor) ? 1 : 0 }, 24);
    });

    define({
        id: dragonCheerId,
        cooldownParameter: "wait",
        name: "龙声鼓舞",
        description: "用一声龙吟般的鼓舞罩住自己和身边的队友：他们在这段时间里更容易击中要害，龙属性的队友被激得最强。已聚气的队友不会被鼓舞。",
        uses: ["开打前一声吼，把整队的要害概率一起抬起来", "给龙属性队友更强的鼓舞", "在队伍连击前先把士气铺好"],
        kind: "self",
        range: 1,
        maxRange: 1,
        prepare: 9,
        active: 1,
        recover: 6,
        cooldown: 130,
        style: "roar",
        stationary: true,
        defaults: { roar: true, ai: { maxChase: 15, allyRange: 6 } },
        fields: [flag("roar", "长啸")],
        indicator: function (config, pokemon) {
            return { radius: pokemon ? p(dragonCheerId, "cheerRadius", pokemon) : 4, geometry: "area", style: "roar",
                color: 0x63D6A4, label: config && config.roar === true ? "龙声鼓舞 · 长啸" : "龙声鼓舞 · 短吼" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[dragonCheerId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(dragonCheerId, "tempo", context)),
                recover: Math.round(p(dragonCheerId, "aftercast", context)),
                cooldown: Math.round(p(dragonCheerId, "wait", context)),
                active: 1,
                range: 1
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_dragoncheer:breathe", dragonCheerScene, 1, action.origin(),
                JSON.stringify({ moment: "breathe", roar: config && config.roar === true ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, _move, config, done) {
            const world = action.world(), actor = action.actor(), body = world.observe(actor);
            if (body === null) { done(action); return; }
            const roar = !!(config && config.roar === true);
            const ticks = Math.max(80, Math.round(p(dragonCheerId, "cheerTicks", action)));
            const radius = Math.max(2, p(dragonCheerId, "cheerRadius", action));
            const baseChance = Math.max(0.05, Math.min(0.9, p(dragonCheerId, "cheerChance", action)));
            const dragonChance = Math.max(baseChance, Math.min(0.95, p(dragonCheerId, "dragonChance", action)));
            const motes = Math.max(10, Math.round(p(dragonCheerId, "motes", action)));
            const waves = Math.max(2, Math.min(5, Math.round(p(dragonCheerId, "waves", action))));
            const scale = Math.max(0.6, Math.min(2.2, radius / dragonCheerReferenceRadius));
            const center = body.position();

            const nearby = world.query(center, radius, false);
            const candidates: CombatActor[] = [actor].concat(Array.prototype.slice.call(nearby));
            const seen: { [ref: string]: boolean } = {};
            let cheered = 0, dragons = 0;
            for (let index = 0; index < candidates.length; index++) {
                const other = candidates[index];
                const key = String(other.ref());
                if (seen[key]) continue;
                seen[key] = true;
                if (String(other.key()) !== String(actor.key()) && !world.friendly(other)) continue;
                // 原生：龙声鼓舞与聚气互斥，已聚气的友方不吃鼓舞。
                if (CombatStatus.has(world, other, "focusenergy")) continue;
                const dragon = dragoncheerIsDragon(world, other);
                const chance = dragon ? dragonChance : baseChance;
                MobEffects.apply(world, other, dragonCheerEffect, ticks, dragon ? 1 : 0);
                dragoncheerReleaseMark(world, other);
                world.effect(dragonCheerMark, other,
                    JSON.stringify({ chance: chance, motes: motes, dragon: dragon ? 1 : 0 }), ticks);
                cheered++;
                if (dragon) dragons++;
                const ally = world.observe(other);
                if (ally !== null) WorldFeedback.emit(world, dragonCheerScene, 1, ally.position(),
                    { moment: "rally", target: String(other.ref()), motes: motes, dragon: dragon ? 1 : 0, scale: scale }, 30);
            }

            WorldFeedback.emit(world, dragonCheerScene, 1, center,
                { moment: "roar", target: String(actor.ref()), motes: motes, waves: waves, cheered: cheered, dragons: dragons,
                    scale: scale, intensity: Math.max(0.8, Math.min(1.8, cheered / 3)) }, 40);
            WorldFeedback.text(world, dragoncheerAbove(center), roar ? dragonCheerReadyText : dragonCheerRallyText,
                [cheered, Math.round(ticks / 20)], 34);
            world.sound("minecraft:entity.ender_dragon.growl", center, 16, "{}");
            world.sound("minecraft:entity.ravager.roar", center, 14, "{}");
            done(action);
        }
    });
}
