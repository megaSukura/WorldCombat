/**
 * 精神噪音 / psychicnoise —— 执行组织。
 *
 * 核心念头：射出一道令人不适的音波——命中那一下是特殊伤害，之后目标耳里的杂音盖过一切回复，
 *   任何招式、特性或携带物的治疗都被压住，直到噪音散去。
 *
 * 三幕：
 *   起（windup）：耳边聚起声压，只播预告。
 *   鸣（execute）：沿着瞄准方向放出音波投射物（shared projectile），命中活体结算一次 noise 特殊伤害，
 *       并挂上共享身份 world_combat:status/healblock 的杂音载体；贯穿取向下音波可穿过几个人。
 *   余（hit → linger → recover）：杂音存续期内，共享治疗入口按身份把该目标的回复清零
 *       （见 parameters.ts 的 NativeEffects.healing 贡献），画面在目标耳侧持续低鸣。
 * 反制：音波是直线、有射程，掩体与走位都能让它落空；封回复不阻止移动与出手，只能用速度或换人熬过去。
 */
namespace PokemonSkills {
    function psychicNoiseAbove(point: CombatPoint): CombatPoint { return point.plus(WorldCombat.point(0, 1.2, 0)); }

    // 杂音存续期：在目标耳侧沉着一圈低鸣的杂音环，让玩家看出「它现在回不了血」。
    WorldCombat.on("world_combat:move_psychicnoise/linger", "world_combat:mob_effect_tick", "", function (event: CombatWorldEvent) {
        var data = JSON.parse(String(event.data()));
        if (String(data.id) !== psychicNoiseEffect) return;
        var world = event.world(), actor = event.actor();
        if (!world.valid(actor) || world.tick() % 20 !== 0) return;
        var body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.keep(world, "psychicnoise:seal:" + String(actor.ref()), psychicNoiseScene, 1, body.position(),
            { moment: "linger", target: String(actor.ref()) }, 40);
    });

    // 走完自己的时间与被外力解除是两条岔路：到期是杂音自己散去，被清除是被人硬压下去。
    WorldCombat.on("world_combat:move_psychicnoise/end", "world_combat:mob_effect_removed", "", function (event: CombatWorldEvent) {
        var data = JSON.parse(String(event.data()));
        if (String(data.id) !== psychicNoiseEffect) return;
        var world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        var body = world.observe(actor);
        if (body === null) return;
        var expired = String(data.cause) === "expired";
        WorldFeedback.emit(world, psychicNoiseScene, 1, body.position(),
            { moment: expired ? "recover" : "subside", target: String(actor.ref()), expired: expired ? 1 : 0 }, 26);
        if (expired) WorldFeedback.text(world, psychicNoiseAbove(body.position()), psychicNoiseFadeText, [], 28);
    });

    // 封疗桥：带着 healblock 身份的目标，任何原生／跨 Mod 的合法治疗都在这里被清零，走原生取消规则，
    // 不直接改生命；实际拦下一次回复时在目标耳侧补一记短断音，让玩家看出「这口奶被堵住了」。
    WorldCombat.on("world_combat:move_psychicnoise/seal", "world_combat:healing_incoming", "", function (event: CombatWorldEvent) {
        var actor = event.actor(), world = event.world();
        if (actor === null || !world.valid(actor)) return;
        if (!CombatStatus.has(world, actor, psychicNoiseStatus)) return;
        var data = JSON.parse(String(event.data()));
        if (!(data.originalAmount > 0) || !(data.amount > 0)) return;
        data.amount = 0;
        event.data(JSON.stringify(data));
        var body = world.observe(actor);
        if (body !== null) WorldFeedback.emit(world, psychicNoiseScene, 1, body.position(),
            { moment: "mute", target: String(actor.ref()) }, 20);
    });

    define({
        id: psychicNoiseId,
        cooldownParameter: "recharge",
        name: "Psychic Noise",
        description: "射出一道令人不适的音波造成特殊伤害，并让目标在一段时间内无法通过招式、特性或携带的道具回复 HP。",
        uses: ["压住对手的治疗与回复", "惩罚靠回复硬撑的对手", "远程压制并封住续战能力"],
        kind: "aim",
        range: 10,
        maxRange: 18,
        prepare: 10,
        active: 0,
        recover: 8,
        cooldown: 90,
        style: "noise",
        defaults: { pierce: false, ai: { maxChase: 12 } },
        fields: [flag("pierce", "贯穿啸叫")],
        indicator: function (config) {
            return { radius: 0.8, geometry: "line", style: "noise", color: 0xE06AD0,
                label: config && config.pierce === true ? "精神噪音·贯穿" : "精神噪音" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[psychicNoiseId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return { prepare: p(psychicNoiseId, "tempo", context), recover: p(psychicNoiseId, "settle", context),
                cooldown: p(psychicNoiseId, "recharge", context), active: 0, range: p(psychicNoiseId, "reach", context) };
        },
        windup: function (action, config, prepare) {
            action.present("psychicnoise:windup", psychicNoiseScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", target: action.target() === null ? "" : String(action.target()!.ref()),
                    pierce: config && config.pierce === true }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const power = p(psychicNoiseId, "noise", action);
            const ticks = Math.max(40, Math.round(p(psychicNoiseId, "sealTicks", action)));
            const speed = Math.max(0.2, p(psychicNoiseId, "waveSpeed", action));
            const radius = Math.max(0.15, p(psychicNoiseId, "radius", action));
            const reach = action.range();
            const pierce = !!(config && config.pierce);
            const discharge = Math.max(8, Math.round(p(psychicNoiseId, "dissonance", action)));
            sound(action, "cobblemon:move.psychic.actor");
            const appearance: any = { sprite: "cobblemon:generic/psychic/psyswirl", tint: 0xE06AD0, glow: true, scale: 0.9 };
            if (pierce) appearance.pierce = 4;
            // 按真实发射几何预计算飞行末点：无重力直线，射程即是实际终点；完成时用它散音，不再用可能过期的目标点。
            const launch = action.origin(), heading = aim(action);
            const endPoint = launch.plus(heading.scale(reach));
            let resolved = false;
            const flight = LivingActions.projectile(action, {
                speed: speed, range: reach, radius: radius, direction: heading, gravity: 0,
                lifetime: Math.max(40, Math.round(reach / speed) + 40),
                appearance: appearance,
                impact: function (current, hit, age) {
                    const scope = current.world(), target = hit.target();
                    if (target === null || scope.friendly(target)) {
                        resolved = true;
                        WorldFeedback.emit(scope, psychicNoiseScene, 1, hit.position(), { moment: "fizzle" }, 20);
                        return;
                    }
                    const landed = impact(current, hit, psychicNoiseId, power, { damage: damageSpec(psychicNoiseId, "noise"), sound: true });
                    if (!landed) return;
                    resolved = true;
                    CombatStatus.apply(scope, target, psychicNoiseStatus, psychicNoiseEffect, ticks, 0, { unique: true });
                    const point = hit.position();
                    WorldFeedback.emit(scope, psychicNoiseScene, 1, point,
                        { moment: "hit", target: String(target.ref()), motes: discharge,
                            intensity: Math.max(0.5, Math.min(2.2, power / 75)) }, 28);
                    WorldFeedback.text(scope, psychicNoiseAbove(point), psychicNoiseText, [Math.round(ticks / 20)], 32);
                    scope.sound("cobblemon:impact.psychic", point, 16, "{}");
                    scope.sound("minecraft:entity.warden.attack_impact", point, 10, "{}");
                }
            }, function (current) {
                // 只有整条波从未接触任何目标时才算落空，且落点用实际末点，不在未命中的目标身上假散音。
                if (!resolved) WorldFeedback.emit(current.world(), psychicNoiseScene, 1, endPoint, { moment: "fizzle" }, 18);
                done(current);
            });
            WorldFeedback.emit(world, psychicNoiseScene, 1, action.origin(),
                { moment: "wave", projectile: flight, reach: reach, discharge: discharge, pierce: pierce ? 1 : 0 }, 40);
        }
    });
}
