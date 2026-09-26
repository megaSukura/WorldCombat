/**
 * 密语 / Confide — 执行组织。
 *
 * 核心念头：凑到对手耳边说一个秘密，把「集中力」从它手里拿走。秘密是声音，沿直线钻进耳朵，
 *   墙和掩体都挡不住；所以它不需要通视，也不需要瞄准——代价是只认听得见的距离，而且降得少。
 *
 * 出手：短起手（windup 在喉间聚起低语）后提交；声音本身不飞、不铺地。
 * 命中：目标挂共享的 world_combat:confided_whisper（身份 world_combat:status/confided），
 *       再 NativeEffects.boost 下降特攻；宝可梦损失原生特攻等级，其他生物落到共享特攻阶梯（原版生物没有特攻属性，
 *       这一级只作为世界阶梯读法，不改变近战攻击力）。
 * 传谣：同一句话扩散到目标 rumorRadius 内的其他非友方，各自再浅一些，总数受 maxListeners 限制；
 *       声音同样不需要通视，但必须有人站在目标身边才值得。传谣表现按实际被说中的人逐条从目标分出一条短低语，
 *       谁在扩散范围内一眼可数。
 * 反制：拉开到 whisperRange 之外就听不见；降幅很小，不足以扭转正面对拼。
 */
namespace PokemonSkills {
    function confideAbove(point: CombatPoint): CombatPoint { return point.plus(WorldCombat.point(0, 1, 0)); }

    /** 把秘密告诉一个听得见的人：挂身份、扣特攻、播命中表现与浮字。
     *  传谣的听众带上 branchFrom（源头目标的 ref），低语从那个人身上单独分出一道短线；主目标不带，走施法者到目标的主线。 */
    function confideWhisper(world: CombatWorld, target: CombatActor, drop: number, focus: number, whispers: number, branchFrom?: string): void {
        MobEffects.apply(world, target, confideEffect, focus, 0);
        NativeEffects.boost(world, target, "spa", -drop);
        const body = world.observe(target);
        if (body === null) return;
        const at = String(target.ref());
        WorldFeedback.emit(world, confideScene, 1, body.position(),
            { moment: branchFrom ? "branch" : "leak", target: at,
                path: branchFrom ? [branchFrom, at] : ["source", at],
                drop: drop, whispers: branchFrom ? Math.max(4, Math.round(whispers * 0.55)) : whispers },
            branchFrom ? 22 : 30);
        if (!branchFrom)
            WorldFeedback.text(world, confideAbove(body.position()), "world_combat.move.confide.text.whisper", [drop], 40);
    }

    define({
        id: confideId,
        cooldownParameter: "recharge",
        name: "密语",
        description: "凑到对手耳边说个秘密，让它失去集中力，降低它的特攻。密语是声音，能绕过掩体，但只在听得见的距离内生效；也可以把它当成闲话传出去，让目标周围的其他敌人一起失神。",
        uses: ["隔着掩体削弱法系威胁", "削弱高特攻敌人的后续输出", "趁敌人扎堆时一句闲话拖住几个"],
        kind: "enemy",
        range: 6,
        maxRange: 9,
        prepare: 8,
        active: 1,
        recover: 5,
        cooldown: 140,
        style: "whisper",
        defaults: { rumor: false },
        fields: [
            flag("rumor", "传谣")
        ],
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[confideId], detail: { values: config }, world, actor, attributes };
            return {
                prepare: Math.round(p(confideId, "tempo", context)),
                recover: p(confideId, "recover", context),
                cooldown: Math.round(p(confideId, "recharge", context)),
                active: 1,
                range: p(confideId, "whisperRange", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("confide-windup", confideScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", rumor: config && config.rumor ? 1 : 0,
                    target: action.target() === null ? "" : String(action.target()!.ref()) }));
            return prepare;
        },
        indicator: function (config) {
            const rumor = !!(config && config.rumor);
            return { radius: rumor ? 7 : 6, geometry: "line", style: "whisper", color: 0x8A7BD8,
                label: rumor ? "密语·传谣" : "密语" };
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const drop = Math.max(1, Math.min(2, Math.round(p(confideId, "drop", action))));
            const focus = Math.max(60, Math.round(p(confideId, "focusTicks", action)));
            const whispers = Math.max(6, Math.round(p(confideId, "whispers", action)));
            const rumor = !!(config && config.rumor);
            sound(action, "minecraft:entity.villager.ambient");
            const target = action.target();
            if (target === null || !world.valid(target) || world.friendly(target)) {
                WorldFeedback.emit(world, confideScene, 1, action.targetPosition(), { moment: "fizzle" }, 16);
                done(action);
                return;
            }
            // 声音不需要通视：掩体挡不住密语，这正是它不用瞄准的价值。
            confideWhisper(world, target, drop, focus, whispers);
            if (rumor) {
                const at = world.observe(target);
                const centre = at === null ? action.targetPosition() : at.position();
                const radius = Math.max(1.2, p(confideId, "rumorRadius", action));
                const cap = Math.max(1, Math.round(p(confideId, "maxListeners", action)));
                const sourceRef = String(target.ref());
                let caught = 1;
                // 结算与人数不变：还是目标 rumorRadius 内最多 maxListeners 个非友方；
                // 只是每被说中一个人就从他那里分出一道短低语，画出的正是实际听众。
                WorldGeometry.select(world, WorldGeometry.ring(centre, 0, radius), function (actor, facts) {
                    if (caught >= cap || facts.friendly() || String(actor.ref()) === sourceRef) return;
                    confideWhisper(world, actor, drop, focus, whispers, sourceRef);
                    caught++;
                });
                if (caught > 1)
                    WorldFeedback.text(world, confideAbove(centre), "world_combat.move.confide.text.rumor", [caught - 1], 40);
            }
            done(action);
        }
    });

    // 失神期间，目标头顶持续浮起零碎的低语点。
    WorldCombat.on("world_combat:move_confide/linger", "world_combat:mob_effect_tick", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== confideEffect) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor) || world.tick() % 8 !== 0) return;
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.keep(world, "confide:" + String(actor.ref()), confideScene, 1, body.position(),
            { moment: "linger", target: String(actor.ref()) }, 20);
    });
}
