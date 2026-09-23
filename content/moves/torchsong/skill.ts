/**
 * 闪焰高歌 / torchsong 的出手方式。
 *
 * 核心念头：站定引吭的一支火之歌。张口朝目标喷出一道越唱越旺的火焰锥，歌声把热顺着嗓子送出去，
 * 火焰里裹着音符；唱到最高音，这一嗓子也把自己的特攻烧旺一级。全程站定不接触，靠的是那条锥面。
 *
 * 两幕（多段脉冲 + 收势）：
 *   起（inhale，提交前）：吸满一口气，火星与音符往嗓子口收。
 *   唱（sing 每段 → hit → boost → fade）：提交后按段喷焰，每段沿当前朝向往目标方向扫过一条锥面，
 *       圈内的对手各吃总威力的 1/pulses；第一次命中即提高特攻；唱完收声。
 *
 * 与同族分开：起草／蓄能焰袭／流水旋舞都是接触位移招，闪焰高歌是**不接触的持续火锥**，也是唯一提高特攻的一支。
 */
namespace PokemonSkills {
    const torchsongScene = "world_combat:move_torchsong";
    const torchsongGiftText = "world_combat.move.torchsong.text.gift";
    const torchsongHitText = "world_combat.move.torchsong.text.hit";

    define({
        id: "torchsong",
        name: "闪焰高歌",
        description: "站定引吭，朝面前喷出一道持续的火锥：整支歌分多段扫过，锥内的敌人被逐段烧灼；第一次烧到目标时，自己的特攻也提高一档。",
        uses: ["隔着一段距离用火锥压住对手", "把并排站着的对手一起罩进锥面", "开场先唱一支，把自己的特攻烧起来"],
        kind: "enemy",
        range: 6,
        maxRange: 10,
        prepare: 10,
        active: 40,
        recover: 10,
        cooldown: 50,
        style: "song",
        stationary: true,
        defaults: { marcato: false, ai: { maxChase: 16, minGap: 4 } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("torchsong", "reach", pokemon), geometry: "cone", style: "fire", color: 0xF0A030, label: "闪焰高歌" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["torchsong"], detail: { values: config }, world, actor, attributes };
            return {
                prepare: Math.round(p("torchsong", "inhale", context)),
                recover: Math.round(p("torchsong", "recover", context)),
                cooldown: Math.round(p("torchsong", "cooldown", context)),
                active: skills["torchsong"].active,
                range: p("torchsong", "reach", context) + 0.4
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_torchsong:inhale", torchsongScene, 1, action.origin(),
                JSON.stringify({ moment: "inhale", marcato: !!(config && config.marcato) }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const pulses = Math.max(3, Math.min(7, Math.round(p("torchsong", "pulses", action))));
            const interval = Math.max(2, Math.round(p("torchsong", "interval", action)));
            const song = p("torchsong", "song", action);
            const per = song / pulses;
            const reach = p("torchsong", "reach", action);
            const half = p("torchsong", "spread", action) / 2;
            const gift = Math.max(1, Math.round(p("torchsong", "spaGift", action)));
            const notes = Math.round(p("torchsong", "notes", action));
            const push = p("torchsong", "push", action);
            const scale = reach / 7;
            const intensity = Math.max(0.6, Math.min(2.4, song / 100));
            let index = 0, boosted = false, hits = 0, settled = false;
            function finish(current: CombatAction): void { if (!settled) { settled = true; done(current); } }

            function pulse(current: CombatAction): void {
                const scope = current.world();
                const body = scope.observe(actor);
                if (body === null) { finish(current); return; }
                current.stopMovement();
                const victim = action.target() !== null && scope.valid(action.target()!) ? action.target() : null;
                const victimBody = victim === null ? null : scope.observe(victim);
                const aimPoint = victimBody === null ? action.targetPosition() : victimBody.position();
                const from = body.position();
                const delta = aimPoint.minus(from);
                const direction = delta.length() < 0.01 ? action.direction() : delta.unit();
                current.face(aimPoint, 30, 30);
                WorldFeedback.keep(scope, "torchsong:sing:" + String(actor.ref()), torchsongScene, 1, from, {
                    moment: "sing", direction: [direction.x(), direction.y(), direction.z()],
                    reach: reach, half: half, scale: scale, notes: notes, intensity: intensity, pulse: index + 1
                }, interval + 4);
                let struck = 0;
                WorldGeometry.selectEnemies(scope, WorldGeometry.sector(from, direction, reach, half * 2, { below: 2, above: 3 }), function (other: CombatActor) {
                    const landed = hurt(current, other, "torchsong", per, { damage: damageSpec("torchsong", "song"), sound: true });
                    if (!landed) return;
                    struck++;
                    const otherBody = scope.observe(other);
                    if (otherBody !== null) scope.displace(other, direction.scale(push));
                });
                hits += struck;
                if (struck > 0) {
                    WorldFeedback.emit(scope, torchsongScene, 1, aimPoint,
                        { moment: "hit", scale: scale, intensity: intensity, notes: notes, targets: struck }, 24);
                    if (!boosted) {
                        boosted = true;
                        NativeEffects.boost(scope, actor, "spa", gift);
                        WorldFeedback.emit(scope, torchsongScene, 1, from, { moment: "boost", gift: gift }, 30);
                        WorldFeedback.text(scope, from.plus(WorldCombat.point(0, 1.4, 0)), torchsongGiftText, [gift], 34);
                        scope.sound("cobblemon:move.nastyplot.actor_2", from, 16, "{}");
                    }
                }
                index++;
                if (index >= pulses) {
                    WorldFeedback.emit(scope, torchsongScene, 1, from, { moment: "fade", scale: scale, sung: hits > 0 }, 24);
                    if (hits > 0) WorldFeedback.text(scope, from.plus(WorldCombat.point(0, 1.5, 0)), torchsongHitText, [hits], 24);
                    finish(current);
                    return;
                }
                current.after(interval, pulse);
            }
            sound(action, "cobblemon:move.sing.actor");
            pulse(action);
        }
    });
}
