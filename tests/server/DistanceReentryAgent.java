import java.lang.instrument.ClassFileTransformer;
import java.lang.instrument.Instrumentation;
import java.security.ProtectionDomain;
import org.objectweb.asm.ClassReader;
import org.objectweb.asm.ClassWriter;
import org.objectweb.asm.Opcodes;
import org.objectweb.asm.tree.*;

/** Test-only stack capture. Does not catch errors or alter chunk scheduling. */
public final class DistanceReentryAgent implements ClassFileTransformer {
    private static final String TARGET = "net/minecraft/server/level/DistanceManager";
    private static final String DEPTH = "worldcombatTest$distanceUpdateDepth";

    public static void premain(String ignored, Instrumentation instrumentation) {
        instrumentation.addTransformer(new DistanceReentryAgent(), false);
    }

    @Override public byte[] transform(ClassLoader loader, String name, Class<?> previous,
            ProtectionDomain domain, byte[] bytes) {
        if (!TARGET.equals(name)) return null;
        ClassNode type = new ClassNode();
        new ClassReader(bytes).accept(type, 0);
        type.fields.add(new FieldNode(Opcodes.ACC_PRIVATE, DEPTH, "I", null, null));
        int methods = 0;
        for (MethodNode method : type.methods) {
            if (!method.name.equals("runAllUpdates")
                    || !method.desc.equals("(Lnet/minecraft/server/level/ChunkMap;)Z")) continue;
            methods++;
            for (AbstractInsnNode instruction : method.instructions.toArray()) {
                int opcode = instruction.getOpcode();
                if (opcode == Opcodes.IRETURN || opcode == Opcodes.ATHROW)
                    method.instructions.insertBefore(instruction, changeDepth(-1));
            }
            InsnList head = changeDepth(1);
            LabelNode ordinary = new LabelNode();
            head.add(new VarInsnNode(Opcodes.ALOAD, 0));
            head.add(new FieldInsnNode(Opcodes.GETFIELD, TARGET, DEPTH, "I"));
            head.add(new InsnNode(Opcodes.ICONST_1));
            head.add(new JumpInsnNode(Opcodes.IF_ICMPLE, ordinary));
            head.add(new TypeInsnNode(Opcodes.NEW, "java/lang/Exception"));
            head.add(new InsnNode(Opcodes.DUP));
            head.add(new LdcInsnNode("WORLD_COMBAT_TEST: recursive DistanceManager.runAllUpdates"));
            head.add(new MethodInsnNode(Opcodes.INVOKESPECIAL, "java/lang/Exception", "<init>",
                    "(Ljava/lang/String;)V", false));
            head.add(new MethodInsnNode(Opcodes.INVOKEVIRTUAL, "java/lang/Exception", "printStackTrace", "()V", false));
            head.add(ordinary);
            head.add(new FrameNode(Opcodes.F_SAME, 0, null, 0, null));
            method.instructions.insert(head);
        }
        if (methods != 1) throw new IllegalStateException("Expected one distance update method, found " + methods);
        ClassWriter writer = new ClassWriter(ClassWriter.COMPUTE_MAXS);
        type.accept(writer);
        System.err.println("WORLD_COMBAT_TEST: installed DistanceManager reentry diagnostic");
        return writer.toByteArray();
    }

    private static InsnList changeDepth(int amount) {
        InsnList code = new InsnList();
        code.add(new VarInsnNode(Opcodes.ALOAD, 0));
        code.add(new InsnNode(Opcodes.DUP));
        code.add(new FieldInsnNode(Opcodes.GETFIELD, TARGET, DEPTH, "I"));
        code.add(new InsnNode(Opcodes.ICONST_1));
        code.add(new InsnNode(amount > 0 ? Opcodes.IADD : Opcodes.ISUB));
        code.add(new FieldInsnNode(Opcodes.PUTFIELD, TARGET, DEPTH, "I"));
        return code;
    }
}
