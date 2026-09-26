/**
 * 缝影 / spiritshackle 的出手方式。
 *
 * 核心念头：**一箭把目标的影子钉在它脚下的实际地面**——暗影箭命中后，目标脚下的影子被几道缝线扣在地面一点上，再也走不出去。
 *
 * 三幕：
 *   起（windup，提交前）：张弓抽影，暗影在箭尖聚成一支黑箭。
 *   射（shot → seam，提交后）：黑箭沿直线飞出、方块挡箭，命中第一个非友方即结算一次穿影伤害。
 *       只有伤害落地、目标脚下找到真实地表、共享身份 `trapped` 真的施加成功，才起一条影子缝线：
 *       缝线是托管效果 `world_combat:spiritshackle_seam`，保存自己那份钉住载体的 key；
 *       它每 4 刻确认锚地仍在、载体仍是自己这一份，并把影池与缝线续期。
 *   松（snap / release）：被外力带离锚点超过 `escape` 格绷断，锚地被挖掉或控制被解除时收缝，时长走完自然松开。
 *
 * 与同族分开：捕兽夹是提前埋点等人踩；缝影是一箭钉在当前目标脚下的影子里，唯一的中远距离狙击式定身。
 *
 * 自由瞄准：`kind: "aim"` 接受任意阵营实体或世界点，箭打到哪里算哪里；攻击权限仍由命中层独立控制。
 *
 * 配置 `anchor`（深缝）由 resolve 改时序、由公式改威力／时长／距离：开启＝钉得久但更慢更近；关闭＝快缝。
 */
namespace PokemonSkills {
    const spiritshackleId = "spiritshackle";
    const spiritshackleScene = "world_combat:move_spiritshackle";
    const spiritshacklePinned = "world_combat:spiritshackle_pinned";
    const spiritshackleSeam = "world_combat:spiritshackle_seam";
    const spiritshackleSeamKey = "spiritshackle:seam:";
    const spiritshacklePinText = "world_combat.move.spiritshackle.text.pin";
    const spiritshackleReleaseText = "world_combat.move.spiritshackle.text.release";
    const spiritshackleSnapText = "world_combat.move.spiritshackle.text.snap";
    const spiritshackleNoAnchorText = "world_combat.move.spiritshackle.text.noanchor";
    const spiritshackleBlockedText = "world_combat.move.spiritshackle.text.blocked";

    /** 影子缝线的持久承载：记录锚点与自己那份钉住载体的 key，每几刻复查锚地与载体。 */
    function spiritshackleSeamData(json: string): string {
        const value = JSON.parse(json);
        if (!Array.isArray(value.point) || value.point.length !== 3) throw new Error("Invalid spirit shackle anchor");
        if (typeof value.pinnedKey !== "string" || !value.pinnedKey) throw new Error("Invalid spirit shackle carrier");
        ["escape", "threads", "radius", "scale", "intensity"].forEach(function (key) {
            if (typeof value[key] !== "number" || !isFinite(value[key])) throw new Error("Invalid spirit shackle state");
        });
        return JSON.stringify(value);
    }

    /** 缝线的持续表现绑在它自己的托管效果上：效果自然到期、被驱散或锚地消失时立刻收线。 */
    function spiritshackleVisual(world: CombatWorld, effect: number, victim: CombatActor, data: any): void {
        const anchor = WorldCombat.point(data.point[0], data.point[1], data.point[2]);
        WorldFeedback.onEffect(world, effect, spiritshackleSeamKey + String(victim.ref()), spiritshackleScene, 1, anchor,
            { moment: "seam", target: String(victim.ref()), point: data.point, path: [data.point, String(victim.ref())],
                threads: data.threads, radius: data.radius, scale: data.scale, intensity: data.intensity });
    }

    /** 目标脚下最近的合法实际地表，返回地表顶面；脚下 7 格内没有实心方块（飞空、悬空）时为 null。 */
    function spiritshackleGround(world: CombatWorld, feet: CombatPoint): CombatPoint | null {
        const baseX = Math.floor(feet.x()), baseZ = Math.floor(feet.z()), baseY = Math.floor(feet.y());
        for (let dy = 1; dy >= -6; dy--) {
            const block = world.block(WorldCombat.point(baseX, baseY + dy, baseZ));
            if (block === null) return null;
            const id = String(block.id());
            if (id === "minecraft:air" || id === "minecraft:cave_air" || id === "minecraft:void_air") continue;
            if (id === "minecraft:water" || id === "minecraft:lava") return null;
            return WorldCombat.point(feet.x(), baseY + dy + 1, feet.z());
        }
        return null;
    }

    /** 锚地仍是可缝的实心方块。 */
    function spiritshackleAnchorHolds(world: CombatWorld, anchor: CombatPoint): boolean {
        const block = world.block(WorldCombat.point(Math.floor(anchor.x()), Math.floor(anchor.y()) - 1, Math.floor(anchor.z())));
        if (block === null) return false;
        const id = String(block.id());
        return id !== "minecraft:air" && id !== "minecraft:cave_air" && id !== "minecraft:void_air"
            && id !== "minecraft:water" && id !== "minecraft:lava";
    }

    WorldCombat.effect(spiritshackleSeam, 1, 400, "actor", spiritshackleSeamData, EffectProtocols.unchanged);
    WorldCombat.effectHandler(spiritshackleSeam, "operation:world_combat:dispel", function (effect) {
        const caller = String(effect.caller().key());
        if (caller !== String(effect.source().key()) && caller !== String(effect.target().key())) { effect.reject("effect-not-owned"); return; }
        effect.end();
    });
    WorldCombat.effectHandler(spiritshackleSeam, "start", function (effect) {
        const world = effect.world(), victim = effect.target(), data = JSON.parse(effect.state());
        if (!world.valid(victim)) { effect.end(); return; }
        const pinned = MobEffects.read(world, victim, spiritshacklePinned);
        if (pinned === null || String(pinned.key()) !== data.pinnedKey) { effect.end(); return; }
        data.carrierLease = MobEffects.bind(world, victim, spiritshacklePinned, pinned);
        if (!data.carrierLease) { effect.end(); return; }
        effect.state(JSON.stringify(data));
        spiritshackleVisual(world, effect.id(), victim, data);
        effect.schedule("watch", "watch", 4, "{}");
    });
    WorldCombat.effectHandler(spiritshackleSeam, "watch", function (effect) {
        const world = effect.world(), victim = effect.target(), data = JSON.parse(effect.state());
        if (!world.valid(victim)) { effect.end(); return; }
        const body = world.observe(victim);
        if (body === null || !MobEffects.present(world, data.carrierLease)) { effect.end(); return; }
        const anchor = WorldCombat.point(data.point[0], data.point[1], data.point[2]);
        if (!spiritshackleAnchorHolds(world, anchor)) { data.reason = "anchor"; effect.state(JSON.stringify(data)); effect.end(); return; }
        if (body.position().minus(anchor).length() > data.escape) {
            data.reason = "snapped"; effect.state(JSON.stringify(data));
            WorldFeedback.emit(world, spiritshackleScene, 1, body.position(),
                { moment: "snap", target: String(victim.ref()), point: data.point, threads: data.threads, scale: data.scale }, 22);
            WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.1, 0)), spiritshackleSnapText, [], 22);
            world.sound("minecraft:block.chain.break", body.position(), 14, "{}");
            effect.end();
            return;
        }
        spiritshackleVisual(world, effect.id(), victim, data);
        effect.schedule("watch", "watch", 4, "{}");
    });
    WorldCombat.effectHandler(spiritshackleSeam, "end", function (effect) {
        const world = effect.world(), victim = effect.target(), data = JSON.parse(effect.state());
        if (!world.valid(victim)) return;
        const pinned = MobEffects.read(world, victim, spiritshacklePinned);
        if (pinned !== null && String(pinned.key()) === data.pinnedKey) world.removeMobEffect(victim, spiritshacklePinned, pinned.key());
        if (data.reason === "snapped") return;
        const body = world.observe(victim);
        if (body === null) return;
        WorldFeedback.emit(world, spiritshackleScene, 1, WorldCombat.point(data.point[0], data.point[1], data.point[2]),
            { moment: "release", target: String(victim.ref()), point: data.point, threads: data.threads, scale: data.scale }, 20);
        WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.1, 0)), spiritshackleReleaseText, [], 22);
        world.sound("cobblemon:impact.ghost", body.position(), 14, "{}");
    });

    // 钉住载体被外力驱散/覆盖：剩下的缝线立刻收掉；还有新载体（重缝）时不动它。
    WorldCombat.on("world_combat:move_spiritshackle/clear", "world_combat:mob_effect_removed", "", function (event) {
        if (String(JSON.parse(String(event.data())).id) !== spiritshacklePinned) return;
        const world = event.world();
        if (MobEffects.read(world, event.actor(), spiritshacklePinned) !== null) return;
        const effects = world.effects(event.actor(), spiritshackleSeam);
        for (let i = 0; i < effects.length; i++) world.operation(effects[i].id(), "world_combat:dispel", "{}");
    });

    // 被缝住的目标不能移动：对宝可梦与原生生物一致归零导航速度（属性归零由状态效果自带）。
    WorldCombat.on("world_combat:move_spiritshackle/roots", "world_combat:navigate", "", function (event) {
        if (MobEffects.read(event.world(), event.actor(), spiritshacklePinned) === null) return;
        const data = JSON.parse(String(event.data()));
        data.speed = 0;
        event.data(JSON.stringify(data));
    });

    define({
        id: spiritshackleId,
        cooldownParameter: "recharge",
        name: "Spirit Shackle",
        description: "射出一支暗影箭：命中目标即结算穿影伤害，并把它的影子钉在它脚下的实际地面——目标被缝住、无法移动，但仍能出手，直到时长走完、锚地被挖掉或被外力扯断缝线。深缝钉得更久、更重，但更慢更近；快缝更轻、更快更远，但钉得更短。",
        uses: ["把想逃跑的目标钉在原地等队友来收", "在中远距离打断对手的走位", "锁住厚目标不让它脱离近战"],
        kind: "aim",
        range: 12,
        maxRange: 20,
        prepare: 12,
        active: 0,
        recover: 9,
        cooldown: 36,
        style: "shackle",
        defaults: { anchor: false, ai: { maxChase: 14, catchRunners: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p(spiritshackleId, "reach", pokemon), geometry: "line", style: "shackle",
                color: 0x6A4A9A, label: config && config.anchor === true ? "深缝" : "快缝" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[spiritshackleId], detail: { values: config },
                world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(spiritshackleId, "tempo", context)),
                recover: Math.round(p(spiritshackleId, "aftercast", context)),
                cooldown: Math.round(p(spiritshackleId, "recharge", context)),
                active: skills[spiritshackleId].active,
                range: p(spiritshackleId, "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_spiritshackle:windup", spiritshackleScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", anchor: config && config.anchor === true }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const origin = action.origin();
            const power = p(spiritshackleId, "pierce", action);
            const speed = p(spiritshackleId, "arrowSpeed", action);
            const hold = Math.max(70, Math.round(p(spiritshackleId, "pinTicks", action)));
            const escape = Math.max(1.5, p(spiritshackleId, "escape", action));
            const threads = Math.max(8, Math.round(p(spiritshackleId, "threads", action)));
            const radius = Math.max(0.7, p(spiritshackleId, "shadowRadius", action));
            const scale = Math.max(0.6, Math.min(2.2, radius / 0.9));
            const intensity = Math.max(0.6, Math.min(2.4, power / 76));
            let settled = false;

            function finish(current: CombatAction): void { if (!settled) { settled = true; done(current); } }

            /** 伤害落地后钉影：脚下有真实地表、钉住真的施加成功，才起缝线；否则只算这一箭的伤害。 */
            function pin(current: CombatAction, victim: CombatActor): void {
                const scope = current.world(), body = scope.observe(victim);
                if (body === null) return;
                const feet = body.position().minus(WorldCombat.point(0, body.height() / 2, 0));
                const ground = spiritshackleGround(scope, feet);
                if (ground === null) {
                    WorldFeedback.emit(scope, spiritshackleScene, 1, body.position(),
                        { moment: "fizzle", target: String(victim.ref()), scale: scale, intensity: intensity }, 20);
                    WorldFeedback.text(scope, body.position().plus(WorldCombat.point(0, 1.1, 0)), spiritshackleNoAnchorText, [], 24);
                    scope.sound("cobblemon:impact.ghost", body.position(), 14, "{}");
                    return;
                }
                if (!CombatStatus.apply(scope, victim, "trapped", spiritshacklePinned, hold, 0, { unique: true })) {
                    WorldFeedback.emit(scope, spiritshackleScene, 1, body.position(),
                        { moment: "fizzle", target: String(victim.ref()) }, 18);
                    WorldFeedback.text(scope, body.position().plus(WorldCombat.point(0, 1.1, 0)), spiritshackleBlockedText, [], 24);
                    scope.sound("cobblemon:impact.ghost", body.position(), 14, "{}");
                    return;
                }
                const pinned = MobEffects.read(scope, victim, spiritshacklePinned);
                if (pinned === null) return;
                const anchor = [ground.x(), ground.y(), ground.z()];
                const data = { point: anchor, pinnedKey: String(pinned.key()), carrierLease: 0, escape: escape,
                    threads: threads, radius: radius, scale: scale, intensity: intensity, reason: "" };
                scope.effect(spiritshackleSeam, victim, JSON.stringify(data), hold);
                WorldFeedback.text(scope, ground.plus(WorldCombat.point(0, 0.8, 0)), spiritshacklePinText,
                    [Math.round(hold / 20 * 10) / 10], 26);
                scope.sound("minecraft:block.chain.place", ground, 14, "{}");
            }

            sound(action, "minecraft:entity.arrow.shoot");
            const flight = LivingActions.projectile(action, {
                speed: speed, range: action.range(), radius: 0.28,
                lifetime: Math.max(40, Math.round(action.range() / Math.max(0.2, speed) + 30)),
                appearance: { item: "minecraft:spectral_arrow", glow: true, scale: Math.max(0.8, Math.min(1.8, radius * 1.4)) },
                impact: function (current: CombatAction, hit: CombatImpact) {
                    const scope = current.world(), target = hit.target(), at = hit.position();
                    if (target !== null && scope.valid(target) && !scope.friendly(target)) {
                        if (impact(current, hit, spiritshackleId, power, { damage: damageSpec(spiritshackleId, "pierce"), contact: false })) {
                            pin(current, target);
                            return;
                        }
                    }
                    WorldFeedback.emit(scope, spiritshackleScene, 1, at, { moment: "fizzle", scale: scale, intensity: intensity }, 20);
                    scope.sound("cobblemon:impact.ghost", at, 14, "{}");
                }
            }, function (current: CombatAction) { finish(current); });
            WorldFeedback.keep(world, "spiritshackle:shot:" + String(action.id()), spiritshackleScene, 1, origin,
                { moment: "shot", projectile: flight, scale: scale, intensity: intensity }, 200);
        }
    });
}
