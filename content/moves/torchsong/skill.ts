/**
 * 闪焰高歌 / torchsong 的出手方式。
 *
 * 核心念头：站定引吭的一支火之歌。张口朝目标喷出一道越唱越旺的火焰锥，歌声把热顺着嗓子送出去，
 * 火焰里裹着音符；唱到最高音，这一嗓子也把自己的特攻烧旺一级。全程站定不接触，靠的是那条锥面。
 *
 * 两幕（多段脉冲 + 收势）：
 *   起（inhale，提交前）：吸满一口气，火星与音符往嗓子口收。
 *   唱（sing 每段 → hit → boost → fade）：提交后按段喷焰，站定有限转向；判定与画面共用同一个三维锥，
 *       沿朝向撞墙截断（同一几何驱动伤害/可见锥）。看得见目标才跟改瞄点，失去视野就冻结在最后见到的地方；
 *       锥内的对手各吃总威力的 1/pulses，每个真实受击点各炸一次；整支歌第一次造成伤害时提高特攻（按实际值）；
 *       唱完收声。
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
            const intensity = Math.max(0.6, Math.min(2.4, song / 100));
            // 冻结瞄点：目标失去视野后不再隔着墙跟改，最后看得见的位置就是这一句的落点。
            let aim = action.targetPosition();
            if (action.target() !== null && world.valid(action.target()!)) {
                const opening = world.observe(action.target()!);
                if (opening !== null) aim = opening.position();
            }
            let index = 0, boosted = false, hits = 0, settled = false;
            function finish(current: CombatAction): void { if (!settled) { settled = true; done(current); } }

            function pulse(current: CombatAction): void {
                const scope = current.world();
                const body = scope.observe(actor);
                if (body === null) { finish(current); return; }
                current.stopMovement();
                const from = body.position();
                const victim = action.target() !== null && scope.valid(action.target()!) ? action.target() : null;
                const victimBody = victim === null ? null : scope.observe(victim);
                // 只有看得见才跟着改瞄点；否则冻结在最后见到的地方。
                if (victimBody !== null && scope.clear(from, victimBody.position())) aim = victimBody.position();
                const delta = aim.minus(from);
                const raw = delta.length() < 0.01 ? action.direction() : delta.unit();
                const direction = raw.length() < 1e-6 ? WorldCombat.point(0, 0, 1) : raw.unit();
                current.face(aim, 30, 30);
                // 判定与画面共用同一几何：轴被墙截短后，锥长、远半径与可见锥都用这条真实可达长度。
                const wall = WorldGeometry.blockHit(scope, from, from.plus(direction.scale(reach)));
                const length = wall === null ? reach : Math.max(0.5, wall.position().minus(from).length());
                const farRadius = Math.max(0.3, length * Math.tan(half * Math.PI / 180));
                // 每段一个新实例：同 key 续帧不会重启停发时钟，之前的火锥只覆盖第一段。
                WorldFeedback.emit(scope, torchsongScene, 1, from, {
                    moment: "sing", direction: [direction.x(), direction.y(), direction.z()],
                    reach: length, half: half, scale: length / 7, notes: notes, intensity: intensity, pulse: index + 1
                }, interval + 4);
                let struck = 0;
                WorldGeometry.selectBodies(scope, WorldGeometry.bodyFrustum(from, from.plus(direction.scale(length)), 0.05, farRadius),
                    function (other: CombatActor, facts: CombatObservation) {
                    if (String(other.ref()) === String(actor.ref()) || facts.friendly()) return;
                    // 墙/掩体挡住的不吃这一段。
                    if (!scope.clear(from, facts.position())) return;
                    const landed = hurt(current, other, "torchsong", per, { damage: damageSpec("torchsong", "song"), sound: true });
                    if (!landed) return;
                    struck++;
                    const otherBody = scope.observe(other);
                    const at = otherBody === null ? facts.position() : otherBody.position();
                    scope.hitDisplace(other, direction.scale(push));
                    // 每个真实受击点各炸一次，而不是只播到选定瞄点。
                    WorldFeedback.emit(scope, torchsongScene, 1, at,
                        { moment: "hit", scale: length / 7, intensity: intensity, notes: notes, targets: struck }, 24);
                });
                hits += struck;
                if (struck > 0 && !boosted) {
                    boosted = true;
                    // 只在真的提升时发提示，浮字写实际提升的级数（不是配置里的标称值）。
                    const gained = NativeEffects.boost(scope, actor, "spa", gift);
                    if (gained !== 0) {
                        WorldFeedback.emit(scope, torchsongScene, 1, from, { moment: "boost", gift: gained }, 30);
                        WorldFeedback.text(scope, from.plus(WorldCombat.point(0, 1.4, 0)), torchsongGiftText, [gained], 34);
                        scope.sound("cobblemon:move.nastyplot.actor_2", from, 16, "{}");
                    }
                }
                index++;
                if (index >= pulses) {
                    WorldFeedback.emit(scope, torchsongScene, 1, from, { moment: "fade", scale: length / 7, sung: hits > 0 }, 24);
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
