/**
 * 变身 / transform —— 执行组织。
 *
 * 核心念头：照着一名对手的样子重塑自己——招式、六维、类型、特性整套搬过来一段时间；它变成谁的形状，
 *   就只能用谁的手。
 *
 * 三幕：起（windup，提交前）镜面在掌心展开，把对手照进来；描（read 提交后）一道镜光线搭上目标，
 *   把它的形状映回来；披（shift）镜面外壳裹住施法者，整套战斗形态换成对手的；持续（hold）低密度镜光；
 *   收（revert 形态自己走完／snap 被人硬拆，临时层精确收回，施法者回到原来的形态）。
 *
 * 形态层：走共享的 NativeModifiers，把目标的六维、类型、特性与全部招式写进施法者；旁挂记下层的 id，
 *   到期或被清除时按 id 精确收回。目标是宝可梦时才有可复制的形态；不能复制一个正在变身的对手。
 * 反制：变身只是换成对手的手，招式威力与命中照常结算；形态有时限，也会被清除效果提前收回。
 *
 * 交付说明：本招完整交付「招式、六维、类型、特性」四类战斗形态的复制与收回。把外观模型也一起换成对手
 *   的样式需要宿主提供「临时改写渲染形态而不改动个体存档形态」的接口，当前共享层没有该入口，已在报告中
 *   列为可选共享能力缺口；画面用镜面外壳与虹彩光点读出「照对手重塑」这件事。
 */
namespace PokemonSkills {
    /** 机读旁挂：记下这次临时层的 id 与复制来的形态信息，供收回与画面读取。 */
    WorldCombat.effect(transformMark, 1, 1200, "actor", function (json) {
        const value = JSON.parse(json || "{}");
        if (typeof value.layer !== "number" || value.layer < 0) throw new Error("Invalid transform layer");
        if (typeof value.max !== "number" || !isFinite(value.max) || value.max < 1) throw new Error("Invalid transform window");
        if (typeof value.species !== "string") throw new Error("Invalid transform species");
        return JSON.stringify(value);
    }, EffectProtocols.unchanged);
    WorldCombat.effectHandler(transformMark, "start", function () { });
    WorldCombat.effectHandler(transformMark, "operation:world_combat:dispel", function (effect) { effect.end(); });

    function transformGrade(world: CombatWorld, actor: CombatActor): any {
        const views = world.effects(actor, transformMark);
        return views.length ? JSON.parse(String(views[0].data())) : null;
    }
    /** 把目标当前有效的招式 id 列出来，写进旁挂（供消费方与画面读）。 */
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
    /** 收回这次变身：结束临时层与旁挂，施法者回到自己的形态。 */
    function transformRevert(world: CombatWorld, actor: CombatActor): void {
        const data = transformGrade(world, actor);
        if (data !== null && typeof data.layer === "number" && data.layer >= 0) world.operation(data.layer, "world_combat:dispel", "{}");
        const views = world.effects(actor, transformMark);
        for (let i = 0; i < views.length; i++) world.operation(views[i].id(), "world_combat:dispel", "{}");
    }

    define({
        id: transformId,
        cooldownParameter: "recharge",
        name: "变身",
        description: "照着一名对手的样子重塑自己：招式、六维、类型与特性整套换成它的，维持一段时间，到期或被清除时精确收回。它变成谁的形状，就只能用谁的手。",
        uses: ["借对手的整套招式与六维打这一段", "把对手的高攻或高防形态搬过来", "在了解对手后换一种完全不同的打法"],
        kind: "enemy",
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
            if (target === null || !world.valid(target) || world.friendly(target)) return "invalid-target";
            if (String(target.ref()) === String(self.ref())) return "invalid-target";
            if (String(self.domain()) !== "cobblemon" || String(target.domain()) !== "cobblemon") return "no-form";
            if (!world.valid(self)) return "invalid-target";
            if (CombatStatus.has(world, target, transformStatus)) return "already-copy";
            const body = world.observe(self), other = world.observe(target);
            if (body === null || other === null) return "invalid-target";
            if (other.position().minus(body.position()).length() > p(transformId, "reach", action)) return "out-of-range";
            return world.clear(body.position(), other.position()) ? "" : "no-line";
        },
        windup: function (action, config, prepare) {
            const target = action.target();
            action.present("world_combat:move_transform:windup", transformScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", target: target === null ? "" : String(target.ref()),
                    motes: p(transformId, "motes", action), dwell: config && config.dwell === true ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world(), self = action.actor(), target = action.target();
            const body = world.observe(self);
            if (body === null || target === null || !world.valid(target) || world.friendly(target)
                || String(target.ref()) === String(self.ref()) || CombatStatus.has(world, target, transformStatus)
                || String(target.domain()) !== "cobblemon") { done(action); return; }
            const other = world.observe(target);
            if (other === null) { done(action); return; }
            const hold = Math.max(80, Math.round(p(transformId, "hold", action)));
            const motes = Math.max(6, Math.round(p(transformId, "motes", action)));
            const enemy = CobblemonCombat.pokemon(target);
            const species = String(enemy.species()), shape = String(enemy.form());
            // 刷新而不是叠加：先收掉旧的临时层与身份，再披上新的。
            transformRevert(world, self);
            const previous = MobEffects.read(world, self, transformEffect);
            if (previous !== null) world.removeMobEffect(self, transformEffect, previous.key());
            const layer = NativeModifiers.copy(world, self, target, hold);
            CombatStatus.apply(world, self, transformStatus, transformEffect, hold, 0, { unique: true });
            world.effect(transformMark, self, JSON.stringify({ layer: layer, species: species, form: shape,
                moves: transformMoves(world, target), max: hold, motes: motes }), hold);
            WorldFeedback.emit(world, transformScene, 1, other.position(),
                { moment: "read", target: String(target.ref()), motes: motes,
                    path: [String(self.ref()), String(target.ref())] }, 24);
            WorldFeedback.emit(world, transformScene, 1, body.position(),
                { moment: "shift", target: String(self.ref()), motes: motes, scale: Math.max(0.6, Math.min(2, hold / 400)),
                    intensity: Math.max(0.7, Math.min(2, motes / 12)) }, 40);
            WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.3, 0)), transformShiftText, [species], 40);
            sound(action, "minecraft:entity.illusioner.mirror_move");
            done(action);
        }
    });

    // 持续：每 40 刻续一层低密度镜光，让玩家读出形态还在、还剩多久。
    WorldCombat.on("world_combat:move_transform/hold", "world_combat:mob_effect_tick", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== transformEffect) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor) || world.tick() % 40 !== 0) return;
        const mark = transformGrade(world, actor);
        if (mark === null) return;
        const body = world.observe(actor);
        if (body === null) return;
        const views = world.effects(actor, transformMark);
        const remaining = views.length ? views[0].remaining() : mark.max;
        const surge = Math.max(0, Math.min(1, 1 - remaining / Math.max(1, mark.max)));
        WorldFeedback.keep(world, "world_combat:move_transform/mirror/" + String(actor.ref()), transformScene, 1, body.position(),
            { moment: "hold", target: String(actor.ref()), motes: mark.motes || 10, surge: surge, species: mark.species || "" }, 44);
    });

    // 结束：到期是形态自己走完，被外力清除是被人硬拆；两条岔路都精确收回临时层。
    WorldCombat.on("world_combat:move_transform/revert", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== transformEffect) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        const expired = String(data.cause) === "expired";
        transformRevert(world, actor);
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.emit(world, transformScene, 1, body.position(),
            { moment: expired ? "revert" : "snap", target: String(actor.ref()), expired: expired ? 1 : 0 }, 28);
        WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.3, 0)), transformRevertText, [], expired ? 28 : 24);
        world.sound(expired ? "minecraft:entity.illusioner.mirror_move" : "minecraft:entity.item.break", body.position(), 12, "{}");
    });
}
