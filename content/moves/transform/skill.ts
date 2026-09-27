/**
 * 变身 / transform —— 执行组织。
 *
 * 一句话：照准一名可见对象，把它的整套实际战斗配置借过来一段时间——宝可梦给招式、六维、类型与特性，
 *   普通主体给原生攻击、移动与防护属性；自己的生命、等级与外形都不动。
 *
 * 所有权：每次变身是一枚自己的 transformMark（记录这次复制层、载体锚点、到期刻与画面数），加一枚真正
 *   在身上显示的 MobEffect 载体（共享身份 world_combat:status/transformed）。宝可梦分支的
 *   NativeModifiers.copy 层用 world_combat:stage_owner 挂到 mark 上，mark 里再存 carrier；mark 每刻都核对
 *   自己的层还在、载体锚点仍匹配，二者任一消失就同步清掉自己的标记。刷新按「先证成新的、再撤旧的」：
 *   先建新复制层，成功后才换新载体、挂新 mark，最后才收回旧 mark；旧回调只撤自己记下的层与自己的载体
 *   锚点，失败时旧形态与旧载体原样保留，不会误伤新形态。外形模型不随形态改变，画的是「借了什么构成」。
 */
namespace PokemonSkills {
    interface TransformState {
        branch: "native" | "attributes";
        /** 这次复制产生的效果 id：宝可梦是 NativeModifiers 层，普通主体是 CombatCopies 层。 */
        layer: number;
        /** 这次形态真正显示的那枚 MobEffect；刷新时旧锚点不再匹配，新载体保留。 */
        carrier?: MobEffects.Anchor;
        species: string;
        form: string;
        ability: string;
        /** 宝可梦分支复制到的招式 id，供画面与说明读。 */
        moves: string[];
        /** 普通分支复制到的属性 id，供画面与说明读。 */
        keys: string[];
        max: number;
        /** 这次形态的到期刻，用来把「自然走完」和「被硬拆」分开。 */
        until: number;
        motes: number;
    }

    WorldCombat.effect(transformMark, 2, 1200, "actor", function (json) {
        const value: TransformState = JSON.parse(json || "{}");
        if (value.branch !== "native" && value.branch !== "attributes") throw new Error("Invalid transform branch");
        if (typeof value.layer !== "number" || !isFinite(value.layer) || value.layer < 0) throw new Error("Invalid transform layer");
        if (value.carrier !== undefined && !MobEffects.validAnchor(value.carrier)) throw new Error("Invalid transform carrier");
        if (typeof value.species !== "string") throw new Error("Invalid transform species");
        if (typeof value.form !== "string") throw new Error("Invalid transform form");
        if (typeof value.ability !== "string") throw new Error("Invalid transform ability");
        if (!Array.isArray(value.moves) || !Array.isArray(value.keys)) throw new Error("Invalid transform profile");
        if (typeof value.max !== "number" || !isFinite(value.max) || value.max < 1) throw new Error("Invalid transform window");
        if (typeof value.until !== "number" || !isFinite(value.until)) throw new Error("Invalid transform expiry");
        if (typeof value.motes !== "number" || !isFinite(value.motes) || value.motes < 0) throw new Error("Invalid transform motes");
        return JSON.stringify(value);
    }, EffectProtocols.unchanged);
    /** 这次 mark 记下的复制层是否仍在自己身上；被单独撤层后标记要同步退出。 */
    function transformLayerAlive(world: CombatWorld, actor: CombatActor, state: TransformState): boolean {
        const definition = state.branch === "native" ? "cobblemon_world_combat:modifier" : "world_combat:attribute_copy";
        const views = world.effects(actor, definition);
        for (let i = 0; i < views.length; i++) if (views[i].id() === state.layer) return true;
        return false;
    }
    /** 上一份普通分支复制的值与剩余时长；普通复制按 CombatCopies 同源合同重建，失败时据此还原。 */
    function transformPriorCopy(world: CombatWorld, actor: CombatActor): { values: CombatCopies.Values; ticks: number } | null {
        const views = world.effects(actor, "world_combat:attribute_copy");
        for (let i = 0; i < views.length; i++) {
            const data = JSON.parse(String(views[i].data()));
            if (data && data.source === "transform" && !data.additive)
                return { values: data.values || {}, ticks: Math.max(1, views[i].remaining()) };
        }
        return null;
    }
    /** 扫描用自定义 scene 逐帧推进：两端顶点读真实实体，静止时也能看到扫线掠过。 */
    function transformScan(action: CombatAction, self: CombatActor, target: CombatActor, motes: number, moveCount: number): void {
        const world = action.world();
        WorldFeedback.emit(world, transformScanScene, 1, action.origin(),
            { moment: "scan", path: [String(target.ref()), String(self.ref())], motes: motes,
                moveCount: moveCount, start: world.tick(), duration: 12 }, 20);
    }
    WorldCombat.effectHandler(transformMark, "start", function (effect) {
        const world = effect.world(), actor = effect.target(), state: TransformState = JSON.parse(effect.state());
        if (!world.valid(actor) || !transformLayerAlive(world, actor, state)) { effect.end(); return; }
        effect.schedule("watch", "watch", 1, "{}");
    });
    WorldCombat.effectHandler(transformMark, "watch", function (effect) {
        const world = effect.world(), actor = effect.target(), state: TransformState = JSON.parse(effect.state());
        if (!world.valid(actor) || !state.carrier || !MobEffects.matches(world, actor, state.carrier)
            || !transformLayerAlive(world, actor, state)) { effect.end(); return; }
        effect.schedule("watch", "watch", 1, "{}");
    });
    WorldCombat.effectHandler(transformMark, "end", function (effect) {
        const world = effect.world(), actor = effect.target(), state: TransformState = JSON.parse(effect.state());
        // 只收回本次的复制层；精确 id，不碰别人的层。
        if (state.layer > 0) world.operation(state.layer, "world_combat:dispel", "{}");
        const mine = world.valid(actor) && !!state.carrier && MobEffects.matches(world, actor, state.carrier);
        const current = world.valid(actor) ? MobEffects.read(world, actor, transformEffect) : null;
        // 新的形态载体还在身上而自己的锚点已失效：这是一次刷新，安静退场，不抹掉新形态。
        if (!mine && current !== null) return;
        if (mine && state.carrier) world.removeMobEffect(actor, state.carrier.id, state.carrier.key);
        transformFinish(world, actor, state, world.tick() >= state.until);
    });
    WorldCombat.effectHandler(transformMark, "operation:world_combat:dispel", function (effect) { effect.end(); });

    function transformFinish(world: CombatWorld, actor: CombatActor, state: TransformState, expired: boolean): void {
        if (!world.valid(actor)) return;
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.emit(world, transformScene, 1, body.position(),
            { moment: expired ? "revert" : "snap", target: String(actor.ref()), motes: state.motes }, 28);
        WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.3, 0)), transformRevertText, [], expired ? 28 : 24);
        world.sound(expired ? "minecraft:entity.illusioner.mirror_move" : "minecraft:entity.item.break", body.position(), 12, "{}");
    }

    /** 读取一名战斗者当前有效的招式 id（含它自己的临时层），供复制与画面读。 */
    function transformMoves(world: CombatWorld, actor: CombatActor): string[] {
        const pokemon = CobblemonCombat.pokemon(actor), layers = NativeModifiers.read(world, actor), ids: string[] = [];
        for (let slot = 0; slot < pokemon.moveSlots(); slot++) {
            const move = pokemon.move(slot);
            if (move === null) continue;
            const id = layers.moves && layers.moves[String(slot)] || String(move.id());
            if (ids.indexOf(id) < 0) ids.push(id);
        }
        return ids;
    }
    /** 目标确实带来可复制的差异；空属性表或与自身已经相同都拒绝，避免白变一次。 */
    function transformDiffers(world: CombatWorld, actor: CombatActor, target: CombatActor): boolean {
        if (String(target.domain()) !== "cobblemon") {
            const values = CombatCopies.read(world, target);
            return Object.keys(values).length > 0 && CombatCopies.differs(world, actor, values);
        }
        const myPokemon = CobblemonCombat.pokemon(actor), myState = NativeEffects.read(world, actor);
        const otPokemon = CobblemonCombat.pokemon(target), otState = NativeEffects.read(world, target);
        const stats = ["atk", "def", "spa", "spd", "spe"];
        for (let i = 0; i < stats.length; i++) {
            if (Math.abs(NativeEffects.stat(myPokemon, myState, stats[i]) - NativeEffects.stat(otPokemon, otState, stats[i])) > 0.0001) return true;
        }
        if (NativeEffects.types(myPokemon, myState).join(",") !== NativeEffects.types(otPokemon, otState).join(",")) return true;
        if (NativeEffects.ability(myPokemon, myState) !== NativeEffects.ability(otPokemon, otState)) return true;
        const mine = transformMoves(world, actor), theirs = transformMoves(world, target);
        for (let j = 0; j < theirs.length; j++) if (mine.indexOf(theirs[j]) < 0) return true;
        return false;
    }
    function transformFail(world: CombatWorld, actor: CombatActor, key: string): void {
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.emit(world, transformScene, 1, body.position(), { moment: "fail", target: String(actor.ref()) }, 24);
        WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.25, 0)), key, [], 26);
        world.sound("minecraft:entity.villager.no", body.position(), 10, "{}");
    }

    define({
        id: transformId,
        cooldownParameter: "recharge",
        name: "变身",
        description: "临时采用一名可见对象的实际战斗配置；宝可梦提供招式、六维、类型与特性，普通生物提供攻击、移动与防护属性。可以指向敌人，也可以指向队友；自己的生命、等级、库存与外形保留。",
        uses: ["借对手的整套招式与六维打这一段", "把对手的高攻或高防形态搬过来", "在了解对手后换一种完全不同的打法"],
        kind: "aim",
        range: 6,
        maxRange: 10,
        prepare: 10,
        active: 0,
        recover: 9,
        cooldown: 150,
        style: "mirror",
        defaults: { dwell: true, ai: { maxChase: 12, leaveStation: false } },
        fields: [
            flag("dwell", "深扮")
        ],
        indicator: function (config, pokemon) {
            return { radius: pokemon ? p(transformId, "reach", pokemon) : 6, geometry: "line", style: "mirror",
                color: 0xE8B4FF, label: config && config.dwell === true ? "变身·深扮" : "变身·浅扮" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[transformId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: p(transformId, "tempo", context),
                recover: p(transformId, "aftercast", context),
                cooldown: p(transformId, "recharge", context),
                active: 0,
                range: p(transformId, "reach", context)
            };
        },
        ready: function (action) {
            const world = action.sense(), self = action.actor(), target = action.target();
            if (String(self.domain()) !== "cobblemon" || !world.valid(self)) return "no-form";
            // 变身必须有可描的对象；手动空选在这里明确拒绝，AI 会先选好真实目标再提交。
            if (target === null) return "no-target";
            if (!world.valid(target)) return "target-left";
            if (String(target.ref()) === String(self.ref())) return "invalid-target";
            if (CombatStatus.has(world, target, transformStatus)) return "already-copy";
            const body = world.observe(self), other = world.observe(target);
            if (body === null || other === null) return "invalid-target";
            if (action.targetPosition().minus(action.origin()).length() > p(transformId, "reach", action)) return "out-of-range";
            if (!world.clear(action.origin(), action.targetPosition())) return "no-line";
            return transformDiffers(world, self, target) ? "" : "already-same";
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_transform:windup", transformScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", motes: p(transformId, "motes", action) }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world(), self = action.actor(), target = action.target();
            const body = world.observe(self);
            if (body === null || String(self.domain()) !== "cobblemon") { done(action); return; }
            if (target === null || !world.valid(target) || String(target.ref()) === String(self.ref())
                || CombatStatus.has(world, target, transformStatus)) { transformFail(world, self, transformFailText); done(action); return; }
            const other = world.observe(target);
            if (other === null || action.targetPosition().minus(action.origin()).length() > p(transformId, "reach", action)
                || !world.clear(action.origin(), action.targetPosition())) { transformFail(world, self, transformFailText); done(action); return; }
            if (!transformDiffers(world, self, target)) { transformFail(world, self, transformSameText); done(action); return; }

            const hold = Math.max(80, Math.round(p(transformId, "hold", action)));
            const motes = Math.max(6, Math.round(p(transformId, "motes", action)));
            const branch: "native" | "attributes" = String(target.domain()) === "cobblemon" ? "native" : "attributes";
            let layer = 0, species = "native", form = "", ability = "", moves: string[] = [], keys: string[] = [];
            let priorCopy: { values: CombatCopies.Values; ticks: number } | null = null;
            // 任何一步失败都保留旧成功形态：宝可梦层不碰旧层；普通层按同源合同重建，失败时用快照还原。
            function abandon(): void {
                if (layer > 0) world.operation(layer, "world_combat:dispel", "{}");
                if (priorCopy !== null) CombatCopies.apply(world, self, priorCopy.values, priorCopy.ticks, "transform");
                transformFail(world, self, transformFailText); done(action);
            }
            // 1. 先建新的复制层；宝可梦层独立于载体，普通层用同源合同保证数值以原生基值重算。
            if (branch === "native") {
                const pokemon = CobblemonCombat.pokemon(target);
                species = String(pokemon.species()); form = String(pokemon.form());
                ability = NativeEffects.ability(pokemon, NativeEffects.read(world, target));
                moves = transformMoves(world, target);
                layer = NativeModifiers.copy(world, self, target, hold);
            } else {
                const type = world.entityType(target);
                species = type ? String(type.id()) : "native";
                priorCopy = transformPriorCopy(world, self);
                const values = CombatCopies.read(world, target);
                keys = Object.keys(values);
                layer = CombatCopies.apply(world, self, values, hold, "transform");
            }
            if (layer <= 0) { abandon(); return; }
            // 2. 新层成立后才换新载体；替换被拒时撤掉新层并还原旧复制，旧载体仍在。
            const carrier = MobEffects.set(world, self, transformEffect, hold, 0);
            if (carrier === null) { abandon(); return; }
            const anchor = MobEffects.anchor(carrier);
            // 3. mark 记下这次层与载体；建不成就把新层和新载体收干净，旧 mark 不动。
            const mark = world.effect(transformMark, self, JSON.stringify({
                branch: branch, layer: layer, carrier: anchor, species: species, form: form, ability: ability,
                moves: moves, keys: keys, max: hold, until: world.tick() + hold, motes: motes
            }), hold);
            if (mark <= 0) { MobEffects.consume(world, self, transformEffect); abandon(); return; }
            if (branch === "native" && !world.operation(layer, "world_combat:stage_owner",
                JSON.stringify({ actor: String(self.ref()), definition: transformMark, id: mark }))) {
                world.operation(mark, "world_combat:dispel", "{}");
                MobEffects.consume(world, self, transformEffect);
                abandon(); return;
            }
            // 4. 新形态就位后再按明确 owned 收回旧形态；旧 mark 只清自己那次。
            world.effects(self, transformMark).forEach(view => { if (view.id() !== mark) world.operation(view.id(), "world_combat:dispel", "{}"); });

            // 表现：扫描沿目标到自身的真实连线逐帧推进，落定后按分支显示形态或有限属性纹；持续镜光绑在本次 mark 上。
            transformScan(action, self, target, motes, branch === "native" ? moves.length : keys.length);
            WorldFeedback.emit(world, transformScene, 1, body.position(),
                { moment: branch === "native" ? "shift" : "marks", target: String(self.ref()),
                    motes: motes, moveCount: moves.length, marks: keys.length,
                    scale: Math.max(0.6, Math.min(2, hold / 400)), intensity: Math.max(0.7, Math.min(2, motes / 12)) }, 40);
            if (mark > 0) WorldFeedback.onEffect(world, mark, "world_combat:move_transform/hold", transformScene, 1, body.position(),
                { moment: "hold", target: String(self.ref()), motes: motes });
            WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.3, 0)), transformShiftText,
                [{ key: branch === "native" ? "cobblemon.species." + species + ".name" : "entity.minecraft." + String(species).replace("minecraft:", ""),
                    fallback: species }], 40);
            WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.72, 0)),
                branch === "native" ? transformCopyText : transformMarkText,
                branch === "native" ? [{ key: "cobblemon.ability." + ability, fallback: ability }, moves.length] : [keys.length], 48);
            sound(action, "minecraft:entity.illusioner.mirror_move");
            done(action);
        }
    });
}
