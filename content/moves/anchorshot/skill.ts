/**
 * 掷锚 / anchorshot 的出手方式。
 *
 * 核心念头：**把锚连同铁链甩出去、钉在对手脚下的地面**——锚头砸中就是重而硬的一记，锚在它脚下扎住，
 *   链子绷直把对手拴在锚点上：它走不出链长，想逃就被链一节节拽回来。链拴在**地面**而不是术者身上，
 *   所以术者可以走开；被外力拖得超过 `snap` 或链走完时间，链就松开，锚点的世界痕迹随链一起归还。
 *
 * 三幕（提交前只播预告）：
 *   起（windup，提交前）：把链在手里抡圆、锚头沉沉朝前，只播预告，可被打断。
 *   掷（execute → flight → clank / miss）：提交后锚头沿小弧飞出，砸中第一个非友方即结算一次 `shot` 物理伤害，
 *      并在它脚下的地面按 `anchorGround` 找一格租借 `minecraft:chain` 作为锚点标记。
 *   拴（chain → reel / snap / release）：命中后给目标挂共享身份 `world_combat:status/trapped`（本单元
 *      `world_combat:anchor_chain_status`），并起一个随目标存亡的 `world_combat:anchor_chain`：每 2 刻量一次
 *      目标到锚点的距离——超过链长就朝锚点拽回 `reel`，超过 `snap` 就绷断；走完 `chainTicks` 自动收回。
 *
 * 与同族分开：绑紧把目标拴在术者身边、术者也被拖慢；紧束把目标裹在原地；挡路立一堵墙；黑色目光靠凝视维持。
 *   掷锚把目标钉在一个**固定的地面锚点**上，术者可以走开，链是世界里看得见、归还得了的一样东西。
 *
 * 配置 `heavy`（重锚式）由 resolve 改时序、由公式改威力／链长／leash／绷断距离；提交后才触碰世界。
 */
namespace PokemonSkills {
    const anchorshotCarrier = "world_combat:anchor_chain_status";
    const anchorshotEffect = "world_combat:anchor_chain";
    const anchorshotKey = "anchorshot:chain:";

    function anchorshotChainData(json: string): string {
        const value = JSON.parse(json);
        if (!Array.isArray(value.anchor) || value.anchor.length !== 3
            || !value.anchor.every(function (n: any) { return typeof n === "number" && isFinite(n); }))
            throw new Error("Invalid anchor point");
        ["leash", "snap", "reel", "links", "scale", "intensity"].forEach(function (key) {
            if (typeof value[key] !== "number" || !isFinite(value[key])) throw new Error("Invalid anchor chain state");
        });
        if (value.leash <= 0 || value.snap <= value.leash || value.reel < 0) throw new Error("Invalid anchor chain state");
        return JSON.stringify(value);
    }

    /** 目标脚下最近的地面顶面高度（找不到就取目标自身高度）。 */
    function anchorshotSurface(world: CombatWorld, at: CombatPoint, x: number, z: number): number {
        const base = Math.floor(at.y());
        for (let probe = base + 1; probe >= base - 4; probe--) {
            const block = world.block(WorldCombat.point(x, probe, z));
            if (block === null) break;
            const id = String(block.id());
            if (id === "minecraft:air" || id === "minecraft:cave_air" || id === "minecraft:void_air") continue;
            if (id === "minecraft:water" || id === "minecraft:lava") break;
            return probe + 1;
        }
        return base;
    }

    /**
     * 把锚钉在目标脚边的原生地面：从目标所在格向四邻依次找一个自己已是空气、且下方有实心支撑的格子
     * （目标自己站的那格放不下实体链子），以 `replace:false, ground:true` 租借 `minecraft:chain` 作为
     * 世界里的可见锚记；不替换任何承重块。返回真实锚点与租约 id，放不下时返回 null。
     */
    function anchorshotPlace(world: CombatWorld, at: CombatPoint, ticks: number): { anchor: CombatPoint; terrainId: number } | null {
        const offsets = [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]];
        const cx = Math.floor(at.x()), cz = Math.floor(at.z());
        for (let index = 0; index < offsets.length; index++) {
            const x = cx + offsets[index][0], z = cz + offsets[index][1], y = anchorshotSurface(world, at, x, z);
            const cell = world.block(WorldCombat.point(x, y, z));
            if (cell === null) continue;
            const id = String(cell.id());
            if (!(id === "minecraft:air" || id === "minecraft:cave_air" || id === "minecraft:void_air")) continue;
            try {
                const lease = world.terrain(JSON.stringify({ cells: [{ x: x, y: y, z: z, block: anchorshotAnchorBlock }], replace: false, ground: true, linger: true }), ticks);
                if (lease > 0) return { anchor: WorldCombat.point(x + 0.5, y, z + 0.5), terrainId: lease };
            } catch (error) { }
        }
        return null;
    }

    /** 锚点租约是否仍在世界里；租约失效、被破坏或被别的施工接手都视为锚已不在。 */
    function anchorshotAnchored(world: CombatWorld, terrainId: number, anchor: CombatPoint): boolean {
        if (!(terrainId > 0)) return false;
        const cells = world.terrainCells(terrainId), x = Math.floor(anchor.x()), y = Math.floor(anchor.y()), z = Math.floor(anchor.z());
        for (let index = 0; index < cells.length; index++)
            if (cells[index].x() === x && cells[index].y() === y && cells[index].z() === z) return true;
        return false;
    }

    /** 链路表现绑在本条链自己的托管效果上：锚失效、链被驱散或目标离场时同刻收回，不再各持一份计时。 */
    function anchorshotChainVisual(world: CombatWorld, effectId: number, victim: CombatActor, data: any): void {
        const body = world.observe(victim);
        if (body === null) return;
        WorldFeedback.onEffect(world, effectId, anchorshotKey + String(victim.ref()), anchorshotScene, 1, body.position(),
            { moment: "chain", target: String(victim.ref()), path: [data.anchor, String(victim.ref())],
                links: data.links, scale: data.scale, intensity: data.intensity });
    }

    WorldCombat.effect(anchorshotEffect, 1, 300, "actor", anchorshotChainData, EffectProtocols.unchanged);
    WorldCombat.effectHandler(anchorshotEffect, "operation:world_combat:dispel", function (effect) {
        const caller = String(effect.caller().key());
        if (caller !== String(effect.source().key()) && caller !== String(effect.target().key())) { effect.reject("effect-not-owned"); return; }
        effect.end();
    });
    WorldCombat.effectHandler(anchorshotEffect, "start", function (effect) {
        const world = effect.world(), victim = effect.target();
        if (!world.valid(victim)) { effect.end(); return; }
        const data = JSON.parse(effect.state());
        // 可见锚已经由施法动作真实钉进地面；锚当时没放成，这条链根本不会建立。
        if (!anchorshotAnchored(world, data.terrainId, WorldCombat.point(data.anchor[0], data.anchor[1], data.anchor[2]))) { effect.end(); return; }
        if (!CombatStatus.apply(world, victim, "trapped", anchorshotCarrier, effect.remaining(), 0, { unique: true })) { effect.end(); return; }
        data.carrierLease = MobEffects.bind(world, victim, anchorshotCarrier);
        if (!data.carrierLease) { effect.end(); return; }
        effect.state(JSON.stringify(data));
        anchorshotChainVisual(world, effect.id(), victim, data);
        effect.schedule("hold", "hold", 2, "{}");
    });
    WorldCombat.effectHandler(anchorshotEffect, "hold", function (effect) {
        const world = effect.world(), victim = effect.target(), data = JSON.parse(effect.state());
        if (!world.valid(victim)) { effect.end(); return; }
        const body = world.observe(victim);
        if (body === null || !MobEffects.present(world, data.carrierLease)) { effect.end(); return; }
        const anchor = WorldCombat.point(data.anchor[0], data.anchor[1], data.anchor[2]);
        // 锚点被破坏或租约失效：链立即断开，不补坐标、不留幽灵链。
        if (!anchorshotAnchored(world, data.terrainId, anchor)) {
            data.reason = "snapped"; effect.state(JSON.stringify(data)); effect.end(); return;
        }
        const delta = anchor.minus(body.position()), distance = delta.length();
        if (distance > data.snap) {
            data.reason = "snapped"; effect.state(JSON.stringify(data)); effect.end(); return;
        }
        // 按原生位移回执回拽：拉不动就不继续补坐标，交给原生碰撞与抗性决定实际结果。
        if (distance > data.leash && distance > 0.01)
            world.displace(victim, delta.unit().scale(Math.min(distance - data.leash, data.reel)));
        anchorshotChainVisual(world, effect.id(), victim, data);
        effect.schedule("hold", "hold", 2, "{}");
    });
    WorldCombat.effectHandler(anchorshotEffect, "end", function (effect) {
        const world = effect.world(), victim = effect.target(), data = JSON.parse(effect.state());
        if (typeof data.terrainId === "number" && data.terrainId > 0) { try { world.removeTerrain(data.terrainId); } catch (error) { } }
        if (!world.valid(victim)) return;
        const body = world.observe(victim);
        if (body === null) return;
        const snapped = data.reason === "snapped";
        WorldFeedback.emit(world, anchorshotScene, 1, body.position(),
            { moment: snapped ? "snap" : "release", target: String(victim.ref()) }, 24);
        WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.2, 0)),
            snapped ? anchorshotSnapText : anchorshotReleaseText, [], 24);
        world.sound(snapped ? "minecraft:block.chain.break" : "minecraft:block.chain.place", body.position(), 14, "{}");
    });

    WorldCombat.on("world_combat:move_anchorshot/clear", "world_combat:mob_effect_removed", "", function (event) {
        if (String(JSON.parse(String(event.data())).id) !== anchorshotCarrier) return;
        const world = event.world();
        if (MobEffects.read(world, event.actor(), anchorshotCarrier) !== null) return;
        const effects = world.effects(event.actor(), anchorshotEffect);
        for (let i = 0; i < effects.length; i++) world.operation(effects[i].id(), "world_combat:dispel", "{}");
    });

    /** 被链拴住的目标走不快：导航速度压到六成，逃出去的部分由链的每步回拽补上。 */
    WorldCombat.on("world_combat:move_anchorshot/rein", "world_combat:navigate", "", function (event) {
        if (MobEffects.read(event.world(), event.actor(), anchorshotCarrier) === null) return;
        const data = JSON.parse(String(event.data()));
        data.speed = Math.max(0, (typeof data.speed === "number" ? data.speed : 0.2) * 0.6);
        event.data(JSON.stringify(data));
    });

    /**
     * 把可见锚真实钉进目标脚边的原生地面，再把链拴到那个锚点上；返回真实锚点。
     * 放不下任何一格合格地面时返回 null：只保留主击，不建看不见的链，也不补一个假锚点。
     */
    function anchorshotBind(world: CombatWorld, action: CombatAction, victim: CombatActor): { anchor: CombatPoint; terrainId: number } | null {
        const body = world.observe(victim);
        if (body === null) return null;
        const ticks = Math.max(40, Math.round(p(anchorshotId, "chainTicks", action)));
        // 世界锚记比链稍长一点，链自然收回时再一起归还，避免同刻到期被误判成锚被破坏。
        const placed = anchorshotPlace(world, body.position(), ticks + 40);
        if (placed === null) return null;
        const existing = world.effects(victim, anchorshotEffect);
        for (let i = 0; i < existing.length; i++) world.operation(existing[i].id(), "world_combat:dispel", "{}");
        const data = { anchor: [placed.anchor.x(), placed.anchor.y(), placed.anchor.z()], carrierLease: 0,
            leash: Math.max(2.2, p(anchorshotId, "leash", action)),
            snap: Math.max(4.5, p(anchorshotId, "snap", action)),
            reel: Math.max(0.15, p(anchorshotId, "reel", action)),
            links: Math.max(5, Math.round(p(anchorshotId, "links", action))),
            scale: Math.max(0.6, Math.min(2.0, p(anchorshotId, "linkRadius", action) / anchorshotReference)),
            intensity: Math.max(0.6, Math.min(2.2, p(anchorshotId, "shot", action) / 80)),
            terrainId: placed.terrainId, reason: "" };
        const id = world.effect(anchorshotEffect, victim, JSON.stringify(data), ticks);
        if (!world.effects(victim, anchorshotEffect).some(function (view) { return view.id() === id; })) {
            try { world.removeTerrain(placed.terrainId); } catch (error) { }
            return null;
        }
        return placed;
    }

    define({
        id: anchorshotId,
        cooldownParameter: "recharge",
        name: "Anchor Shot",
        description: "把锚连同铁链甩出去，砸中对手后在它脚下的地面钉住：链子绷直把目标拴在锚点上，它走不出链长、想逃就被拽回来。链拴在地面而不是术者身上，术者可以走开；被拖得太远或链走完时间就松开。重锚式钉得更死更久，但更慢更近。",
        uses: ["把想逃跑的目标钉在原地等队友收", "在开阔地一对一锁住对方的主力", "把高机动目标从掩体边拽回来"],
        kind: "aim",
        range: 6,
        maxRange: 9,
        prepare: 8,
        active: 0,
        recover: 7,
        cooldown: 60,
        style: "anchor",
        defaults: { heavy: false, ai: { maxChase: 8, escapers: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p(anchorshotId, "reach", pokemon), geometry: "line", style: "anchor", color: 0x9AA3AD,
                label: config && config.heavy === true ? "重锚式" : "快掷式" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills[anchorshotId], detail: { values: config },
                world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(anchorshotId, "tempo", context)),
                recover: Math.round(p(anchorshotId, "aftercast", context)),
                cooldown: Math.round(p(anchorshotId, "recharge", context)),
                active: 0,
                range: p(anchorshotId, "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            const links = Math.max(5, Math.round(p(anchorshotId, "links", action)));
            action.present("world_combat:anchorshot:windup", anchorshotScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", heavy: config && config.heavy === true ? 1 : 0, links: links }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const power = p(anchorshotId, "shot", action);
            const speed = Math.max(0.8, p(anchorshotId, "flight", action));
            const radius = Math.max(0.18, p(anchorshotId, "linkRadius", action));
            const reach = Math.max(4, p(anchorshotId, "reach", action));
            const links = Math.max(5, Math.round(p(anchorshotId, "links", action)));
            const scale = Math.max(0.6, Math.min(2.0, radius / anchorshotReference));
            const intensity = Math.max(0.6, Math.min(2.2, power / 80));
            const chain = Math.max(40, Math.round(p(anchorshotId, "chainTicks", action)));
            const direction = aim(action);
            let struck = false, settled = false;

            sound(action, "minecraft:item.trident.throw");
            const flight = LivingActions.projectile(action, {
                speed: speed, range: reach + 2, radius: radius, gravity: 0.03, lifetime: 140, direction: direction,
                appearance: { item: "minecraft:anvil", scale: Math.max(0.8, Math.min(1.8, radius / 0.28)), glow: false },
                impact: function (current: CombatAction, hit: CombatImpact) {
                    const scope = current.world(), victim = hit.target(), at = hit.position();
                    // 自由甩方向：只有真的砸中一个非友方实体才建立绳；撞墙/空锚只留表现。
                    if (struck || victim === null || !scope.valid(victim) || scope.friendly(victim)) return;
                    if (!impact(current, hit, anchorshotId, power,
                        { damage: damageSpec(anchorshotId, "shot"), contact: true })) return;
                    struck = true;
                    const bound = anchorshotBind(scope, current, victim);
                    // 落锚成功时，钢花在真实锚点炸开；钉不进去就只保留主击，不做假链。
                    const clankAt = bound !== null ? bound.anchor : at;
                    WorldFeedback.emit(scope, anchorshotScene, 1, clankAt,
                        { moment: "clank", target: String(victim.ref()), links: links, scale: scale, intensity: intensity }, 24);
                    WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.15, 0)),
                        bound !== null ? anchorshotBoundText : anchorshotSlipText,
                        bound !== null ? [Math.round(chain / 20)] : [], 24);
                    sound(current, "minecraft:block.chain.place");
                    sound(current, "cobblemon:impact.steel");
                }
            }, function (current: CombatAction) {
                if (settled) return;
                settled = true;
                const scope = current.world();
                if (!struck) {
                    WorldFeedback.emit(scope, anchorshotScene, 1, current.targetPosition(), { moment: "miss", scale: scale }, 18);
                    WorldFeedback.text(scope, current.targetPosition(), anchorshotMissText, [], 20);
                }
                done(current);
            });
            WorldFeedback.keep(world, "anchorshot:fly:" + action.id(), anchorshotScene, 1, action.origin(),
                { moment: "flight", projectile: flight, links: links, scale: scale, intensity: intensity }, 90);
        }
    });
}
