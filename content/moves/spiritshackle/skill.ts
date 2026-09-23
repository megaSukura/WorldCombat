/**
 * 缝影 / spiritshackle 的出手方式。
 *
 * 核心念头：**一箭把目标的影子钉在地上**——暗影箭命中后，目标脚下的影子被几道缝线扣在地面一点上，再也走不出去。
 *
 * 三幕：
 *   起（windup，提交前）：张弓抽影，暗影在箭尖聚成一支黑箭。
 *   射（shot → seam，提交后）：黑箭沿直线飞出，命中活物即结算一次穿影伤害，并把目标脚下的影子缝住：
 *       挂上共享身份 `world_combat:status/trapped` 的 `world_combat:spiritshackle_pinned`，移动与导航速度归零；
 *       影子缝线是持久效果 `world_combat:spiritshackle_seam` 每几刻续期的画面，从地面锚点连到目标脚下。
 *   松（snap / release）：被外力带离锚点超过 `escape` 格，缝线绷断、钉住解除；或时长走完自然松开。
 *
 * 与同族分开：捕兽夹是提前埋点等人踩；缝影是一箭钉在当前目标脚下的影子里，唯一的中远距离狙击式定身。
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

    /** 影子缝线的持久承载：每几刻检查目标是否被带离锚点，并把影池与缝线续期；绷断或到期时解除钉住。 */
    function spiritshackleSeamData(json: string): string {
        const value = JSON.parse(json);
        if (!Array.isArray(value.point) || value.point.length !== 3) throw new Error("Invalid spirit shackle anchor");
        ["escape", "threads", "radius"].forEach(function (key) {
            if (typeof value[key] !== "number" || !isFinite(value[key])) throw new Error("Invalid spirit shackle state");
        });
        return JSON.stringify(value);
    }

    function spiritshackleVisual(world: CombatWorld, victim: CombatActor, data: any): void {
        const body = world.observe(victim);
        if (body === null) return;
        WorldFeedback.keep(world, spiritshackleSeamKey + String(victim.ref()), spiritshackleScene, 1,
            WorldCombat.point(data.point[0], data.point[1], data.point[2]),
            { moment: "seam", target: String(victim.ref()), point: data.point,
                path: [data.point, String(victim.ref())],
                threads: data.threads, radius: data.radius, scale: data.scale, intensity: data.intensity }, 60);
    }

    function spiritshackleGround(world: CombatWorld, point: CombatPoint): CombatPoint {
        const baseX = Math.floor(point.x()), baseZ = Math.floor(point.z()), baseY = Math.floor(point.y());
        for (let dy = 2; dy >= -6; dy--) {
            const block = world.block(WorldCombat.point(baseX, baseY + dy, baseZ));
            if (block === null) break;
            const id = String(block.id());
            if (id === "minecraft:air" || id === "minecraft:cave_air" || id === "minecraft:void_air") continue;
            if (id === "minecraft:water" || id === "minecraft:lava") break;
            return WorldCombat.point(point.x(), baseY + dy + 1, point.z());
        }
        return point;
    }

    WorldCombat.effect(spiritshackleSeam, 1, 400, "actor", spiritshackleSeamData, EffectProtocols.unchanged);
    WorldCombat.effectHandler(spiritshackleSeam, "start", function (effect) {
        const world = effect.world(), victim = effect.target(), data = JSON.parse(effect.state());
        if (!world.valid(victim)) { effect.end(); return; }
        spiritshackleVisual(world, victim, data);
        effect.schedule("watch", "watch", 4, "{}");
    });
    WorldCombat.effectHandler(spiritshackleSeam, "watch", function (effect) {
        const world = effect.world(), victim = effect.target(), data = JSON.parse(effect.state());
        const body = world.observe(victim);
        if (body === null) { effect.end(); return; }
        const anchor = WorldCombat.point(data.point[0], data.point[1], data.point[2]);
        if (body.position().minus(anchor).length() > data.escape) {
            data.snapped = true; effect.state(JSON.stringify(data));
            WorldFeedback.keep(world, spiritshackleSeamKey + String(victim.ref()), spiritshackleScene, 1, anchor,
                { moment: "snap", target: String(victim.ref()), point: data.point, threads: data.threads, scale: data.scale }, 22);
            WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.1, 0)), spiritshackleSnapText, [], 22);
            world.sound("minecraft:block.chain.break", body.position(), 14, "{}");
            effect.end();
            return;
        }
        spiritshackleVisual(world, victim, data);
        effect.schedule("watch", "watch", 4, "{}");
    });
    WorldCombat.effectHandler(spiritshackleSeam, "end", function (effect) {
        const world = effect.world(), victim = effect.target(), data = JSON.parse(effect.state());
        if (!world.valid(victim)) return;
        const pinned = MobEffects.read(world, victim, spiritshacklePinned);
        if (pinned !== null) world.removeMobEffect(victim, spiritshacklePinned, pinned.key());
        if (data.snapped) return;
        const body = world.observe(victim);
        if (body === null) return;
        WorldFeedback.keep(world, spiritshackleSeamKey + String(victim.ref()), spiritshackleScene, 1,
            WorldCombat.point(data.point[0], data.point[1], data.point[2]),
            { moment: "release", target: String(victim.ref()), point: data.point, threads: data.threads, scale: data.scale }, 20);
        WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.1, 0)), spiritshackleReleaseText, [], 22);
        world.sound("cobblemon:impact.ghost", body.position(), 14, "{}");
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
        description: "射出一支暗影箭：命中目标即结算穿影伤害，并把它的影子钉在地上——目标被缝住、无法逃走，直到时长走完或被外力扯断缝线。深缝钉得更久但更慢更近；快缝更快更远但钉得更短。",
        uses: ["把想逃跑的目标钉在原地等队友来收", "在中远距离打断对手的走位", "锁住厚目标不让它脱离近战"],
        kind: "enemy",
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

            /** 钉住：挂状态、画影池与缝线、起持久承载。 */
            function pin(current: CombatAction, victim: CombatActor, point: CombatPoint): void {
                const scope = current.world(), at = spiritshackleGround(scope, point);
                const anchor = [at.x(), at.y(), at.z()];
                MobEffects.apply(scope, victim, spiritshacklePinned, hold, 0);
                const data = { point: anchor, escape: escape, threads: threads, radius: radius,
                    scale: scale, intensity: intensity, snapped: false };
                WorldFeedback.keep(scope, spiritshackleSeamKey + String(victim.ref()), spiritshackleScene, 1, at,
                    { moment: "seam", target: String(victim.ref()), point: anchor, path: [anchor, String(victim.ref())],
                        threads: threads, radius: radius, scale: scale, intensity: intensity }, 60);
                current.effect(spiritshackleSeam, victim, JSON.stringify(data), hold);
                WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 0.8, 0)), spiritshacklePinText,
                    [Math.round(hold / 20 * 10) / 10], 26);
                scope.sound("minecraft:block.chain.place", at, 14, "{}");
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
                            pin(current, target, at);
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
