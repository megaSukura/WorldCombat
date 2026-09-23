/**
 * 唱歌 / Sing —— 执行组织。
 *
 * 核心念头：开口唱一首摇篮曲。声音从身上一圈圈荡出去，穿过墙、同伴和替身（不认遮挡），每荡过一遍就
 *   在听者身上多按一分睡意；听满 `notes` 句的目标才睡下。它是一件**持续的事**：唱歌期间施法者站定不动，
 *   被伤害或被打断就只留下半段旋律；听者只要走出声场，睡意会在 `dozeTicks` 内散尽、从头再数。
 *
 * 幕：
 *   起（windup，提交前）：唇边聚起音符、声波在身周攒起，只播预告。
 *   唱（note ×各句 → sleep / immune，提交后）：每一句在施法者身上荡出一圈声波，圈内的非友方各多记一分
 *     睡意（共享身份 world_combat:status/drowsy 的载体 world_combat:sing_drowsy，强度即句数）；够数的
 *     立刻挂上共享的 world_combat:status/sleep（宝可梦那一层同步成原生睡眠）。再多唱两句余韵，让没睡下的
 *     也更容易被下一句带走。
 *   眠（linger，绑定效果）：睡着的人头顶持续飘出 Z 与一圈收拢的剩余环；睡眠被打醒或解掉时它自己收场。
 *
 * 反制：走出声场、在唱完前打断或打醒；睡着的目标一受伤害就醒。免疫睡眠的目标只会挂上睡意、不会入睡。
 */
namespace PokemonSkills {
    function singAbove(point: CombatPoint): CombatPoint { return point.plus(WorldCombat.point(0, 1.0, 0)); }

    // 睡意余韵：跟着睡者的绑定效果，每 20 刻续一次头顶的 Z 与剩余环，睡眠不在就收场。
    WorldCombat.effect(singTrance, 1, 1200, "actor", function (json) {
        const value = JSON.parse(json || "{}");
        if (typeof value.total !== "number" || !isFinite(value.total) || value.total < 1) throw new Error("Invalid sing trance: total");
        if (typeof value.rings !== "number" || !isFinite(value.rings)) throw new Error("Invalid sing trance: rings");
        return JSON.stringify(value);
    }, EffectProtocols.unchanged);
    WorldCombat.effectHandler(singTrance, "start", function (effect) { effect.schedule("tick", "tick", 1, "{}"); });
    WorldCombat.effectHandler(singTrance, "operation:world_combat:dispel", function (effect) { effect.end(); });
    WorldCombat.effectHandler(singTrance, "tick", function (effect) {
        const world = effect.world(), actor = effect.target();
        if (!world.valid(actor) || !CombatStatus.has(world, actor, "sleep")) { effect.end(); return; }
        const body = world.observe(actor);
        if (body === null) { effect.end(); return; }
        const data = JSON.parse(effect.state());
        const remain = Math.max(0, effect.remaining());
        const ratio = data.total > 0 ? Math.max(0, Math.min(1, remain / data.total)) : 0;
        WorldFeedback.keep(world, "sing:" + String(actor.ref()), singScene, 1, body.position(),
            { moment: "linger", target: String(actor.ref()), remain: remain, total: data.total, rings: data.rings,
              ringRadius: Math.round((0.2 + 0.75 * ratio) * 100) / 100 }, 30);
        effect.schedule("tick", "tick", 20, "{}");
    });

    define({
        id: singId,
        cooldownParameter: "recharge",
        name: "唱歌",
        description: "开口唱一首摇篮曲，声波一圈圈荡出去，穿过墙与同伴灌进附近每个敌人的耳朵；听满几句的目标会当场睡下。唱歌期间自己站定不能移动，中途被打断这段旋律就作废，没睡下的目标走出声场后睡意会慢慢散尽。",
        uses: ["把围上来的一群近战一起哄睡", "在交战开始前放倒身边的一圈威胁", "为队友的食梦或恶梦制造多个睡眠目标"],
        kind: "self",
        range: 0,
        maxRange: 0,
        prepare: 10,
        active: 1,
        recover: 12,
        cooldown: 120,
        style: "song",
        defaults: { soothing: false },
        fields: [
            flag("soothing", "悠长")
        ],
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[singId], detail: { values: config }, world, actor, attributes };
            return {
                prepare: Math.round(p(singId, "breath", context)),
                recover: Math.round(p(singId, "aftercast", context)),
                cooldown: Math.round(p(singId, "recharge", context)),
                active: 1,
                range: 0
            };
        },
        windup: function (action, config, prepare) {
            action.present("sing:windup:" + action.id(), singScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", soothing: config && config.soothing === true }));
            return prepare;
        },
        indicator: function (config, pokemon) {
            const context: NumberContext = { pokemon: pokemon!, skill: skills[singId], detail: { values: config } };
            return { radius: pokemon ? p(singId, "reach", context) : 4.5, geometry: "circle", style: "song", color: 0x9B7BD8,
                label: config && config.soothing === true ? "唱歌·悠长" : "唱歌·轻快" };
        },
        execute: function (action, move, config, done) {
            const world = action.world(), self = action.actor();
            const selfBody = world.observe(self);
            const origin = selfBody === null ? action.origin() : selfBody.position();
            const reach = Math.max(3, p(singId, "reach", action));
            const beat = Math.max(8, Math.round(p(singId, "beat", action)));
            const needed = Math.max(2, Math.round(p(singId, "notes", action)));
            const sleepTicks = Math.max(80, Math.round(p(singId, "sleepTicks", action)));
            const dozeTicks = Math.max(40, Math.round(p(singId, "dozeTicks", action)));
            const rings = Math.max(3, Math.round(p(singId, "rings", action)));
            const scale = Math.max(0.5, Math.min(1.8, reach / 5.0));
            const maxBeats = needed + 2;
            let stanza = 0, settled = false;
            function finish(current: CombatAction): void { if (!settled) { settled = true; done(current); } }

            function singNote(current: CombatAction): void {
                const scope = current.world();
                if (!scope.valid(self)) { finish(current); return; }
                const body = scope.observe(self);
                const at = body === null ? origin : body.position();
                scope.sound("minecraft:block.note_block.harp", at, 16, "{}");
                WorldFeedback.emit(scope, singScene, 1, at,
                    { moment: "note", reach: reach, rings: rings, stanza: stanza, notes: needed, scale: scale,
                      expand: Math.round((reach / 20) * 1000) / 1000 }, 26);
                WorldGeometry.selectEnemies(scope, WorldGeometry.ring(at, 0, reach, { below: 2, above: 3 }), function (target: CombatActor) {
                    if (String(target.key()) === String(self.key())) return;
                    if (CombatStatus.has(scope, target, "sleep")) return;
                    const targetBody = scope.observe(target);
                    if (targetBody === null) return;
                    const ref = String(target.ref());
                    const existing = MobEffects.read(scope, target, singDrowsy);
                    const count = (existing === null ? 0 : existing.amplifier()) + 1;
                    MobEffects.apply(scope, target, singDrowsy, dozeTicks, Math.min(20, count));
                    if (count >= needed) {
                        if (!CombatStatus.inflict(scope, target, "sleep", sleepTicks)) {
                            WorldFeedback.emit(scope, singScene, 1, targetBody.position(), { moment: "immune", target: ref }, 20);
                            WorldFeedback.text(scope, singAbove(targetBody.position()), "world_combat.move.sing.text.immune", [], 26);
                            return;
                        }
                        MobEffects.consume(scope, target, singDrowsy);
                        const existingTrance = scope.effects(target, singTrance);
                        for (let i = 0; i < existingTrance.length; i++) scope.operation(existingTrance[i].id(), "world_combat:dispel", "{}");
                        scope.effect(singTrance, target, JSON.stringify({ total: sleepTicks, rings: rings }), sleepTicks + 4);
                        WorldFeedback.emit(scope, singScene, 1, targetBody.position(),
                            { moment: "sleep", target: ref, rings: rings, notes: needed, ticks: Math.round(sleepTicks / 20), scale: scale }, 34);
                        WorldFeedback.text(scope, singAbove(targetBody.position()), "world_combat.move.sing.text.sleep", [Math.round(sleepTicks / 20)], 32);
                        scope.sound("minecraft:entity.fox.sleep", targetBody.position(), 14, "{}");
                        return;
                    }
                    WorldFeedback.emit(scope, singScene, 1, targetBody.position(),
                        { moment: "drowsy", target: ref, stack: count, needed: needed, scale: scale }, 22);
                    WorldFeedback.text(scope, singAbove(targetBody.position()), "world_combat.move.sing.text.drowsy", [count, needed], 24);
                });
                stanza++;
                if (stanza >= maxBeats) { finish(current); return; }
                current.after(beat, singNote);
            }

            sound(action, "minecraft:block.note_block.chime");
            singNote(action);
        }
    });
}
