/**
 * 隐形岩 / stealthrock 的出手方式。
 *
 * 核心念头：抬手把一圈碎石抬到选定的地点悬浮成一圈石阵；有人闯进这片空域，离它最近的一枚悬石就离轨，
 *   像真正的短飞岩一样射过去，只有撞到实体才结算岩属性伤害。原地站住不会被无形地按时间反复砸；飞在
 *   空中的目标也一样能触发（浮岩式）。
 *
 * 三幕：
 *   起（windup，提交前）：脚边碎石浮起的预告。
 *   抬（raise→settle）：提交后碎石飞向落点，散成半径 fieldRadius 的悬浮石阵（WorldEffects.field，
 *       规则 `world_combat:hazard/stealthrock` 由本单元注册）；同一片地上再放会先收回旧阵、重新计数。
 *   守（launch／hit／shatter）：石阵存续 stoneTicks。非友方首次进入（或离开后再进入、且该敌警戒冷却到时、
 *       石阵还有空位）时，最近的一枚悬石离轨，用 `world.projectile` 发射一枚真实飞行的岩块；命名回调
 *       挂在共享的 `world_combat:field` 定义上，只有真的命中实体才按 `fall` 结算，打空或撞墙只留碎屑。
 *       发出的空位过 stoneInterval 补回一枚，最多 6 枚；沉岩式只响应贴地目标。
 *
 * 反制：绕开石阵、等它到期（stoneTicks）；把目标引到实墙后让岩块撞墙；站住不动只挨进入那一下。
 */
namespace PokemonSkills {
    function stealthrockPoint(field: WorldEffects.Field): CombatPoint {
        return WorldCombat.point(field.position[0], field.position[1], field.position[2]);
    }

    /** 同一片地上自己已布下的石阵先收回：隐形岩不叠层，重放就是刷新时长与数值。 */
    function stealthrockRefresh(world: CombatWorld, point: CombatPoint, radius: number): void {
        const own = String(world.source().ref()), found = WorldEffects.areas(world, stealthrockRule);
        for (let i = 0; i < found.length; i++) {
            const entry = found[i];
            if (entry.source !== own) continue;
            const centre = WorldCombat.point(entry.position[0], entry.position[1], entry.position[2]);
            if (centre.minus(point).length() > radius + entry.radius) continue;
            world.operation(entry.id, "world_combat:dispel", "{}");
        }
    }

    /** 第 index 个轨位的世界坐标：绕石阵中心均匀分布、悬在地面上方。它就是发射原点与客户端画点。 */
    function stealthrockSlotPoint(position: number[], radius: number, index: number): CombatPoint {
        const angle = (Math.PI * 2 * index) / stealthrockStones, orbit = radius * 0.6;
        return WorldCombat.point(position[0] + Math.cos(angle) * orbit, position[1] + 0.9,
            position[2] + Math.sin(angle) * orbit);
    }

    /** 六槽状态：位置与是否还有石头；客户端画的就是这一组真实轨位。 */
    function stealthrockSlotData(position: number[], radius: number, slots: number[]): number[][] {
        const out: number[][] = [];
        for (let i = 0; i < stealthrockStones; i++) {
            const point = stealthrockSlotPoint(position, radius, i);
            out.push([point.x(), point.y(), point.z(), slots && slots[i] ? 1 : 0]);
        }
        return out;
    }

    /** 找离目标最近的一枚现有悬石；一枚都没有时返回 -1（容量有限）。 */
    function stealthrockChooseSlot(position: number[], radius: number, slots: number[], target: CombatPoint): number {
        let best = -1, nearest = Infinity;
        for (let i = 0; slots && i < stealthrockStones; i++) {
            if (!slots[i]) continue;
            const distance = stealthrockSlotPoint(position, radius, i).minus(target).length();
            if (distance < nearest) { nearest = distance; best = i; }
        }
        return best;
    }

    /** 从 slot 发射一枚真实飞行的岩块：隔墙不放；发出后该轨位留空并按 stoneInterval 复位。 */
    function stealthrockLaunch(world: CombatWorld, actor: CombatActor, field: WorldEffects.Field, body: CombatObservation, slot: number): boolean {
        const origin = stealthrockSlotPoint(field.position, field.radius, slot), target = body.position();
        if (!world.clear(origin, target)) return false;
        const direction = target.minus(origin);
        if (direction.length() < 0.05) return false;
        const speed = Math.max(0.5, Number(field.data.launchSpeed) || 0.9);
        const range = Math.max(3, field.radius * 2.4);
        const power = Math.max(0, Number(field.data.fall) || 0);
        const now = world.tick();
        field.data.slots[slot] = 0;
        field.data.refill[slot] = now + Math.max(10, Math.round(Number(field.data.interval) || 30));
        const lifetime = Math.max(10, Math.ceil(range / Math.max(0.3, speed)) + 6);
        // Relative to the field's own decreasing clock, so moving ownership never resets the flight horizon.
        field.data.transferRemaining = Math.min(typeof field.data.transferRemaining === "number" ? field.data.transferRemaining : Infinity,
            (field.remaining || 0) - lifetime);
        const flight = world.projectile(origin, direction.unit().scale(speed), 0.03, 0.3, range,
            lifetime, stealthrockHitHandler, stealthrockCompleteHandler,
            JSON.stringify({ power: power, heavy: Number(field.data.heavy) ? 1 : 0 }),
            JSON.stringify({ item: "minecraft:cobblestone", scale: 0.7 }));
        WorldFeedback.emit(world, stealthrockScene, 1, origin,
            { moment: "launch", projectile: flight, target: String(actor.ref()), slot: slot,
                stones: stealthrockStones, power: Math.round(power), scale: field.radius / 2.6 }, 30);
        world.sound("cobblemon:move.rockthrow.actor", origin, 12, "{}");
        return true;
    }

    /**
     * 单个成员的处理：进入时上膛；上膛且冷却到、还有空位、且（沉岩式要求）贴地时发射一枚。
     * 发射成功后下膛，必须离开再进入才会重新上膛——原地站住不会被按时间反复砸。
     */
    function stealthrockVisit(world: CombatWorld, actor: CombatActor, field: WorldEffects.Field, entering: boolean): void {
        if (world.friendly(actor)) return;
        const body = world.observe(actor);
        if (body === null) return;
        const ref = String(actor.ref()), armed = field.data.armed || (field.data.armed = {});
        if (entering) armed[ref] = true;
        if (!armed[ref]) return;
        if (Number(field.data.heavy) && !body.grounded()) return;
        const now = world.tick(), next = field.data.next || (field.data.next = {});
        if (now < (next[ref] || 0)) return;
        const slot = stealthrockChooseSlot(field.position, field.radius, field.data.slots, body.position());
        if (slot < 0) return;
        if (!stealthrockLaunch(world, actor, field, body, slot)) return;
        armed[ref] = false;
        next[ref] = now + Math.max(10, Math.round(Number(field.data.alert) || 40));
    }

    // 命名弹体回调挂在共享 field 定义上：效果作用域以施法者为源，命中走同一份真实伤害结算。
    WorldCombat.effectHandler("world_combat:field", stealthrockHitHandler, function (effect: CombatEffect): void {
        const impact = effect.impact();
        if (impact === null) return;
        const world = effect.world(), at = impact.position();
        if (!impact.hitEntity()) {
            WorldFeedback.emit(world, stealthrockScene, 1, at, { moment: "shatter", scale: 0.9 }, 18);
            world.sound("cobblemon:impact.rock", at, 12, "{}");
            return;
        }
        const target = impact.target();
        if (target === null || !world.valid(target) || world.friendly(target)) return;
        const input: any = JSON.parse(effect.input() || "{}");
        const power = Math.max(0, Number(input && input.power) || 0);
        const features: any = damageFeatures(stealthrockId, "fall");
        features.power = power; features.type = "rock";
        const result = PokemonDamage.resolve(world, effect.source(), target, CobblemonCombat.moveTemplate(stealthrockId), features);
        if (!(result.amount > 0)) return;
        if (!world.projectileHit(impact, result.amount, result.metadata)) return;
        WorldFeedback.emit(world, stealthrockScene, 1, at,
            { moment: "hit", target: String(target.ref()), power: Math.round(power),
                stones: Math.max(6, Math.round(6 + power * 0.2)), scale: 1.0 }, 22);
        world.sound("cobblemon:impact.rock", at, 14, "{}");
    });
    // complete 只负责弹体自然结束；命中或撞墙都已经在 hit 里呈现，不重复造表现。
    WorldCombat.effectHandler("world_combat:field", stealthrockCompleteHandler, function (): void { });

    // 悬浮石阵：进入上膛、命中才结算；轨位空一轮补一枚；表现跟着 field 效果存续。
    WorldEffects.fieldRule(stealthrockRule, {
        // In-flight native projectiles are owned by this field. Wait for replenished slots before changing its source.
        canTransfer: field => Array.isArray(field.data.slots) && field.data.slots.every((slot: number) => slot > 0)
            && (typeof field.data.transferRemaining !== "number" || (field.remaining || 0) <= field.data.transferRemaining),
        enter: function (world: CombatWorld, actor: CombatActor, field: WorldEffects.Field): void {
            const ref = String(actor.ref()), armed = field.data.armed || {};
            const retained = field.reassignedMembers && field.reassignedMembers.indexOf(ref) >= 0 && Object.prototype.hasOwnProperty.call(armed, ref);
            stealthrockVisit(world, actor, field, !retained);
        },
        stay: function (world: CombatWorld, actor: CombatActor, field: WorldEffects.Field): void {
            stealthrockVisit(world, actor, field, false);
        },
        scan: function (effect: CombatEffect, world: CombatWorld, field: WorldEffects.Field): void {
            const slots = field.data.slots, refill = field.data.refill, now = world.tick();
            for (let i = 0; i < stealthrockStones; i++) {
                if (slots && !slots[i] && now >= (refill[i] || 0)) { slots[i] = 1; refill[i] = 0; }
            }
            WorldFeedback.onEffect(world, effect.id(), "stealthrock:field:" + effect.id(), stealthrockFieldScene, 1,
                stealthrockPoint(field), { slots: stealthrockSlotData(field.position, field.radius, slots), radius: field.radius,
                    heavy: Number(field.data.heavy) ? 1 : 0, stones: stealthrockStones });
        }
    }, { tags: [WorldEffects.categories.hazard], transferable: true });

    define({
        id: stealthrockId,
        cooldownParameter: "recharge",
        name: "隐形岩",
        description: "抬手把一圈碎石抬到选定的地点悬浮成 6 枚小石的石阵：敌人首次闯入时，离它最近的一枚悬石会离轨飞出，只有真的砸中才按岩属性结算伤害；原地站住不会被无形地按时间反复砸。飞在空中的目标也能触发浮岩，沉岩式只砸落地目标；发出的空位要过一会儿才补回，容量有限。",
        uses: ["提前在敌人必经的空域布下石阵", "专门惩罚怕岩的目标", "让飞行的敌人也躲不掉"],
        kind: "point",
        range: 9,
        maxRange: 13,
        prepare: 11,
        active: 0,
        recover: 9,
        cooldown: 110,
        style: "stealthrock",
        defaults: { heavy: false },
        fields: [flag("heavy", "沉岩")],
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[stealthrockId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(stealthrockId, "tempo", context)),
                recover: Math.round(p(stealthrockId, "recover", context)),
                cooldown: Math.round(p(stealthrockId, "recharge", context)),
                active: 0,
                range: p(stealthrockId, "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("stealthrock:windup:" + action.id(), stealthrockScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", heavy: config && config.heavy ? 1 : 0 }));
            return prepare;
        },
        indicator: function (config, pokemon) {
            const context: NumberContext = { pokemon: pokemon!, skill: skills[stealthrockId], detail: { values: config } };
            return { radius: p(stealthrockId, "fieldRadius", context), geometry: "area", style: "stealthrock", color: 0xB7B3A6,
                label: config && config.heavy === true ? "隐形岩·沉岩" : "隐形岩·浮岩" };
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const heavy = !!(config && config.heavy);
            const speed = Math.max(0.6, p(stealthrockId, "raiseSpeed", action));
            const radius = Math.max(1.8, p(stealthrockId, "fieldRadius", action));
            const ticks = Math.max(100, Math.round(p(stealthrockId, "stoneTicks", action)));
            const fall = p(stealthrockId, "fall", action);
            const interval = Math.max(10, Math.round(p(stealthrockId, "stoneInterval", action)));
            const alert = Math.max(10, Math.round(p(stealthrockId, "alert", action)));
            const launchSpeed = Math.max(0.4, p(stealthrockId, "launchSpeed", action));
            const scale = radius / 2.6;
            let raised = false;

            function raise(current: CombatAction, point: CombatPoint): void {
                if (raised) return;
                raised = true;
                const scope = current.world();
                stealthrockRefresh(scope, point, radius);
                const slots: number[] = [], refill: number[] = [];
                for (let i = 0; i < stealthrockStones; i++) { slots.push(1); refill.push(0); }
                const field = WorldEffects.field(scope, stealthrockRule, point, radius,
                    { fall: fall, interval: interval, alert: alert, launchSpeed: launchSpeed,
                        heavy: heavy ? 1 : 0, slots: slots, refill: refill, next: {}, armed: {} }, ticks);
                WorldFeedback.emit(scope, stealthrockScene, 1, point,
                    { moment: "raise", radius: radius, heavy: heavy ? 1 : 0, stones: stealthrockStones, scale: scale }, 34);
                WorldFeedback.onEffect(scope, field, "stealthrock:field:" + field, stealthrockFieldScene, 1, point,
                    { slots: stealthrockSlotData([point.x(), point.y(), point.z()], radius, slots), radius: radius,
                        heavy: heavy ? 1 : 0, stones: stealthrockStones });
                WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 0.6, 0)), stealthrockRaiseText, [], 30);
                sound(current, "cobblemon:impact.rock");
                done(current);
            }

            sound(action, "cobblemon:move.rockthrow.actor");
            const flight = LivingActions.projectile(action, {
                speed: speed, range: action.range(), radius: 0.28, gravity: 0.02, lifetime: 110,
                appearance: { item: "minecraft:cobblestone", scale: 0.85 },
                impact: function (current, hit) { raise(current, hit.position()); }
            }, function (current) {
                // 抛石没落地就不布阵：布阵位置取真实投掷终点，而不是最初选定的目标点。
                // complete 在命中后也会触发，必须让已经收招的动作只结束一次。
                if (raised) return;
                raised = true;
                done(current);
            });
            WorldFeedback.emit(world, stealthrockScene, 1, action.origin(),
                { moment: "throw", projectile: flight, stones: stealthrockStones, heavy: heavy ? 1 : 0, scale: scale }, 26);
        }
    });
}
