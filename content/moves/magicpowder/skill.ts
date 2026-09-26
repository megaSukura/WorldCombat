/**
 * 魔法粉 / magicpowder — 出手方式。
 *
 * 核心念头：朝选中的对象撒一把会改写身体的魔法粉——粉末团慢慢飘过去，罩住它、把它整个改写成超能力属性。
 *   草属性生物把粉从身上抖掉、完全免疫；已经是纯超能力的也撒不上去。粉团能躲：飘到之前走开或撞墙就散。
 *
 * 幕：
 *   起（windup，提交前）：手里抖匀这把粉，只观察与预告，可被打断且不花代价。
 *   撒（throw，提交后）：粉团带轻微追踪飘向对象；点或方向都能空撒，撞到墙就在墙上散掉。
 *   改（coat）：真正第一个合法碰到的目标（用户选中的敌或友）被写进共享 NativeModifiers types 层
 *     （单一超能力，到期自动还原原生属性），挂共享身份 `world_combat:status/magicpowder` 的标记；粉粒亮一下。
 *   免（immune）：草属性抖开粉末，只是抖开，不补其他状态。
 *   散（wipe）：改写到期时粉末从身上飘散，告诉玩家这层已经过去；不留一团同质粉云。
 *
 * 反制：草属性免疫粉末（预检直接拒绝，不浪费 20 发 PP）；已经是纯超能力的撒不上去；非法目标明确失败。
 *   瞄准是 kind:aim：可瞄友或敌，选友方时粉团才被允许碰到它。
 */

namespace PokemonSkills {
    export const magicpowderId = "magicpowder";
    export const magicpowderScene = "world_combat:move_magicpowder";
    export const magicpowderEffect = "world_combat:magic_powder";
    export const magicpowderCoatText = "world_combat.move.magicpowder.text.coat";
    export const magicpowderImmuneText = "world_combat.move.magicpowder.text.immune";
    export const magicpowderWipeText = "world_combat.move.magicpowder.text.wipe";
    export const magicpowderFizzleText = "world_combat.move.magicpowder.text.fizzle";
    export const magicpowderEmptyText = "world_combat.move.magicpowder.text.empty";

    function magicpowderAbove(point: CombatPoint): CombatPoint { return point.plus(WorldCombat.point(0, 1.25, 0)); }

    /** 目标当前生效的属性（含临时层）；非宝可梦返回空。 */
    function magicpowderTypes(world: CombatWorld, target: CombatActor): string[] {
        if (String(target.domain()) !== "cobblemon" || !world.valid(target)) return [];
        return NativeEffects.types(CobblemonCombat.pokemon(target), NativeEffects.read(world, target));
    }

    /** 能不能撒：非宝可梦没有属性；草属性免疫粉末；已经是纯超能力也撒不上去。返回拒绝原因或空串。 */
    function magicpowderRefusal(world: CombatWorld, target: CombatActor): string {
        const types = magicpowderTypes(world, target);
        if (types.length === 0) return "no-types";
        if (types.indexOf("grass") >= 0) return "grass-immune";
        if (NativeModifiers.typeLocked(world, target)) return "type-locked";
        return types.join(",") === "psychic" ? "already-psychic" : "";
    }

    // 改写到期：粉末从目标身上飘散。属性层随效果同寿命自动还原。
    WorldCombat.on("world_combat:move_magicpowder/end", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== magicpowderEffect) return;
        if (String(data.cause) !== "expired") return;
        const world = event.world(), target = event.actor();
        if (!world.valid(target)) return;
        const body = world.observe(target);
        if (body === null) return;
        WorldFeedback.emit(world, magicpowderScene, 1, body.position(), { moment: "wipe", target: String(target.ref()) }, 24);
        WorldFeedback.text(world, magicpowderAbove(body.position()), magicpowderWipeText, [], 28);
    });

    define({
        id: magicpowderId,
        cooldownParameter: "recharge",
        name: "魔法粉",
        description: "朝选中的对象撒一把魔法粉，把它当前的全部属性改写成单一超能力属性；草属性生物会把粉抖掉、完全免疫。",
        uses: ["把对手改写成超能力，打开虫、幽灵、恶的弱点", "摘掉对手自己的本系与防守面", "细撒档把改写维持得更久"],
        kind: "aim",
        range: 7,
        maxRange: 12,
        prepare: 7,
        active: 1,
        recover: 6,
        cooldown: 74,
        style: "powder",
        defaults: { sift: false },
        fields: [],
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[magicpowderId], detail: { values: config },
                world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(magicpowderId, "tempo", context)),
                recover: Math.round(p(magicpowderId, "aftercast", context)),
                cooldown: Math.round(p(magicpowderId, "recharge", context)),
                active: 1,
                range: p(magicpowderId, "reach", context)
            };
        },
        indicator: function (config, pokemon) {
            const context: NumberContext = { pokemon: pokemon!, skill: skills[magicpowderId], detail: { values: config } };
            return { radius: p(magicpowderId, "reach", context), geometry: "line", style: "powder", color: 0xE86CC8,
                label: config && config.sift === true ? "魔法粉 · 细撒" : "魔法粉" };
        },
        ready: function (action, config) {
            const world = action.sense(), target = action.target();
            // 点或方向空撒：没有对象也能投，粉团撞墙自散。
            if (target === null) return action.targetPosition().minus(action.origin()).length() > action.range() ? "out-of-range" : "";
            if (!world.valid(target)) return "target-left";
            const body = world.observe(target);
            if (body === null) return "target-left";
            if (body.position().minus(action.origin()).length() > p(magicpowderId, "reach", action)) return "out-of-range";
            if (!world.clear(action.origin(), body.position())) return "no-line";
            return magicpowderRefusal(world, target);
        },
        windup: function (action, config, prepare) {
            const target = action.target();
            action.present("world_combat:move_magicpowder:gather", magicpowderScene, 1, action.origin(),
                JSON.stringify({ moment: "gather", motes: p(magicpowderId, "motes", action),
                    sift: config && config.sift === true ? 1 : 0,
                    target: target === null ? "" : String(target.ref()) }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world(), actor = action.actor(), target = action.target();
            const body = world.observe(actor);
            if (body === null) { done(action); return; }
            const sift = !!(config && config.sift);
            const velocity = Math.max(0.4, p(magicpowderId, "velocity", action));
            const hold = Math.max(40, Math.round(p(magicpowderId, "hold", action)));
            const cloud = Math.max(0.8, p(magicpowderId, "cloud", action));
            const motes = Math.max(10, Math.round(p(magicpowderId, "motes", action)));
            const glints = Math.max(6, Math.round(p(magicpowderId, "glints", action)));
            const chosen = target !== null && world.valid(target) ? String(target.ref()) : "";
            const chosenFriendly = chosen !== "" && world.friendly(target!);
            const scale = Math.max(0.6, Math.min(2.2, cloud / 1.2));
            const from = body.position().plus(WorldCombat.point(0, body.height() * 0.55, 0));
            const aimed = action.targetPosition().minus(from);
            const direction = aimed.length() < 0.01 ? action.direction() : aimed.unit();
            let settled = false;

            function finish(current: CombatAction): void {
                if (settled) return;
                settled = true;
                done(current);
            }

            function coat(current: CombatAction, impact: CombatImpact): void {
                const scope = current.world(), hit = impact.target(), at = impact.position();
                const valid = hit !== null && scope.valid(hit);
                const intended = valid && chosen !== "" && String(hit!.ref()) === chosen;
                const strayEnemy = valid && chosen === "" && !scope.friendly(hit!);
                // 只对用户选中的对象、或空撒时顺路撞到的敌人施类型层；选友方时本弹允许友方接触。
                if (valid && (intended || strayEnemy)) {
                    const refusal = magicpowderRefusal(scope, hit!);
                    const spot = scope.observe(hit!);
                    if (refusal === "grass-immune") {
                        WorldFeedback.emit(scope, magicpowderScene, 1, at, { moment: "immune", target: String(hit!.ref()), scale: scale }, 24);
                        if (spot !== null) WorldFeedback.text(scope, magicpowderAbove(spot.position()), magicpowderImmuneText, [], 28);
                        finish(current);
                        return;
                    }
                    if (refusal) {
                        WorldFeedback.emit(scope, magicpowderScene, 1, at, { moment: "fizzle", target: String(hit!.ref()), reason: refusal }, 18);
                        if (spot !== null) WorldFeedback.text(scope, magicpowderAbove(spot.position()), magicpowderFizzleText, [], 26);
                        finish(current);
                        return;
                    }
                    NativeModifiers.apply(scope, hit!, { types: ["psychic"] }, hold);
                    MobEffects.apply(scope, hit!, magicpowderEffect, hold, sift ? 1 : 0);
                    if (spot !== null) {
                        WorldFeedback.emit(scope, magicpowderScene, 1, spot.position(),
                            { moment: "coat", target: String(hit!.ref()), motes: motes, glints: glints, cloud: cloud,
                                scale: scale, intensity: Math.max(0.7, Math.min(2, hold / 240)) }, 32);
                        WorldFeedback.text(scope, magicpowderAbove(spot.position()), magicpowderCoatText, [], 30);
                    }
                    sound(current, "cobblemon:move.powder.target");
                    finish(current);
                    return;
                }
                const wall = impact.blocked() ? impact.blockPosition() : null;
                WorldFeedback.emit(scope, magicpowderScene, 1, wall === null ? at : wall,
                    { moment: chosen === "" ? "empty" : "miss", motes: motes, scale: scale }, 22);
                finish(current);
            }

            const appearance: LivingActions.ProjectileAppearance = {
                sprite: "cobblemon:particle/generic/powder", scale: Math.max(0.7, scale), tint: 0xE86CC8, hitAllies: chosenFriendly
            };
            if (chosen !== "") appearance.homing = { target: chosen, turn: 6, delay: 1, range: action.range() };
            const flight = LivingActions.projectile(action, {
                speed: velocity, range: action.range(), radius: Math.max(0.24, cloud * 0.3), lifetime: 120,
                direction: direction, appearance: appearance, impact: coat
            }, function (current) {
                WorldFeedback.emit(current.world(), magicpowderScene, 1, current.targetPosition(),
                    { moment: chosen === "" ? "empty" : "miss", motes: motes, scale: scale }, 22);
                finish(current);
            });
            WorldFeedback.emit(world, magicpowderScene, 1, from,
                { moment: "throw", projectile: flight, target: chosen, motes: motes, cloud: cloud, scale: scale }, 34);
            sound(action, "cobblemon:move.powder.actor");
        }
    });
}
