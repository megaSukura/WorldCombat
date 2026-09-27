/**
 * 叫声 / Growl — 执行组织。
 *
 * 核心念头：仰头叫一声，让一圈听得见的对手分神——它不挑面孔、不要求看见你，躲在掩体后会照样被叫到，
 *   所以能把身边贴近的敌人一起叫软；代价是降得浅、也够不到远处。
 *
 * 两幕：
 *   起（windup 播「鼓气」，提交前只观察与预告，可被打断，打断不花代价）。
 *   叫（提交后）：以自身为圆心张开 soundRadius 的一圈，凡圈内非友方都会听见——不看视线。真的被压低攻击的
 *     才挂共享的 world_combat:growl_hush（身份 world_combat:status/charmed，仅作「刚被叫软」的反馈身份）；
 *     攻击不到底或被能力拒绝时不占回执，也不留标记。标记会自行消退，真正的代价是永久的攻击等级下降。
 * 反制：拉开到 hearing 半径之外；它不造成伤害，也挡不住对方绕到圈外再进来。
 */
namespace PokemonSkills {
    function growlAbove(point: CombatPoint): CombatPoint { return point.plus(WorldCombat.point(0, 1, 0)); }

    define({
        id: growlId,
        cooldownParameter: "recharge",
        name: "叫声",
        description: "发出一声可爱的叫喊，让身边听得见的一圈对手分神，降低它们的攻击。声音不需要通视，躲在掩体后也会被叫到；代价是降得浅、也够不到远处。",
        uses: ["被近身围住时叫软一圈敌人", "在敌人扎堆时一次压低几人的出手", "隔着掩体削弱贴身的威胁"],
        kind: "self",
        range: 0,
        maxRange: 0,
        prepare: 6,
        active: 1,
        recover: 5,
        cooldown: 100,
        style: "call",
        defaults: { howl: false },
        fields: [
            flag("howl", "拖长音")
        ],
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[growlId], detail: { values: config }, world, actor, attributes };
            return {
                prepare: Math.round(p(growlId, "tempo", context)),
                recover: p(growlId, "recover", context),
                cooldown: Math.round(p(growlId, "recharge", context)),
                active: 1,
                range: 0
            };
        },
        windup: function (action, config, prepare) {
            action.present("growl-windup", growlScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", howl: config && config.howl ? 1 : 0 }));
            return prepare;
        },
        indicator: function (config, pokemon, inspection) {
            const howl = !!(config && config.howl);
            const values = config || {};
            const context: NumberContext = { pokemon: pokemon!, skill: skills[growlId], detail: { values: values },
                world: inspection && inspection.world, actor: inspection && inspection.actor, attributes: inspection && inspection.attributes };
            const radius = pokemon ? Math.max(2.5, Math.min(7, p(growlId, "soundRadius", context))) : (howl ? 5.5 : 3.5);
            return { radius: radius, geometry: "circle", style: "call", color: 0xE8B84A,
                label: howl ? "叫声·拖长音" : "叫声" };
        },
        execute: function (action, move, config, done) {
            const world = action.world(), self = action.actor();
            const selfBody = world.observe(self);
            const origin = selfBody === null ? action.origin() : selfBody.position();
            const radius = Math.max(2.5, Math.min(7, p(growlId, "soundRadius", action)));
            const drop = Math.max(1, Math.min(2, Math.round(p(growlId, "drop", action))));
            const hush = Math.max(60, Math.round(p(growlId, "hushTicks", action)));
            const notes = Math.max(12, Math.round(p(growlId, "notes", action)));
            sound(action, "minecraft:entity.wolf.growl");
            let hits = 0, softened = 0;
            // 声音不看视线：掩体挡不住这一声叫。只有真的压低攻击才算被叫软；抗性的目标不占回执、也不留标记。
            WorldGeometry.select(world, WorldGeometry.ring(origin, 0, radius, { below: 2, above: 3 }), function (actor, facts) {
                if (facts.friendly()) return;
                const applied = NativeEffects.boost(world, actor, "atk", -drop);
                if (applied === 0) return;
                MobEffects.apply(world, actor, growlEffect, hush, 0);
                hits++;
                softened += Math.abs(applied);
                WorldFeedback.emit(world, growlScene, 1, facts.position(),
                    { moment: "hush", target: String(actor.ref()), drop: Math.abs(applied), notes: notes }, 26);
            });
            const perDrop = hits > 0 ? Math.round(softened / hits) : drop;
            WorldFeedback.emit(world, growlScene, 1, origin,
                { moment: "call", radius: radius, hits: hits, notes: notes, scale: radius / 3.5 }, 34);
            if (hits === 0)
                WorldFeedback.emit(world, growlScene, 1, origin, { moment: "fizzle", scale: radius / 3.5 }, 16);
            WorldFeedback.text(world, growlAbove(origin), hits > 0 ? "world_combat.move.growl.text.call" : "world_combat.move.growl.text.empty",
                hits > 0 ? [hits, perDrop] : [], 32);
            done(action);
        }
    });

    // 分神存续期间，被叫到的人头顶持续飘起错拍的音符。
    WorldCombat.on("world_combat:move_growl/linger", "world_combat:mob_effect_tick", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== growlEffect) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor) || world.tick() % 6 !== 0) return;
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.keep(world, "growl:" + String(actor.ref()), growlScene, 1, body.position(),
            { moment: "linger", target: String(actor.ref()) }, 20);
    });
}
