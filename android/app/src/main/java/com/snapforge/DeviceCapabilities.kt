package com.snapforge

/**
 * Reports at runtime which accelerator each model is actually on — NPU, GPU, or CPU.
 * Per dossier §08 and §18 we say honestly what hardware we are using.
 */
object DeviceCapabilities {
    enum class Accelerator { CPU, GPU, NPU }

    data class ModelCapability(
        val name: String,
        var accelerator: Accelerator
    )

    private val capabilities = mutableListOf(
        ModelCapability("SmolVLM-500M-Instruct", Accelerator.CPU), // Default until P4.5
        ModelCapability("MediaPipe", Accelerator.CPU),
        ModelCapability("Qwen2.5-Coder", Accelerator.CPU)
    )

    fun getCapabilities(): List<ModelCapability> {
        return capabilities.toList()
    }
    
    fun updateCapability(modelName: String, accelerator: Accelerator) {
        capabilities.find { it.name == modelName }?.accelerator = accelerator
    }
}