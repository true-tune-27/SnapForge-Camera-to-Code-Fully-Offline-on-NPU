package com.snapforge

import org.junit.Test
import org.junit.Assert.*
import java.io.File
import javax.xml.parsers.DocumentBuilderFactory
import org.w3c.dom.Element

class ManifestTest {
    @Test
    fun testNoInternetPermissionInReleaseManifest() {
        val manifestFile = File("../build/intermediates/merged_manifest/release/processReleaseMainManifest/AndroidManifest.xml")
        if (!manifestFile.exists()) {
            println("Manifest file not found at ${manifestFile.absolutePath}, skipping test")
            return
        }
        
        val dbFactory = DocumentBuilderFactory.newInstance()
        val dBuilder = dbFactory.newDocumentBuilder()
        val doc = dBuilder.parse(manifestFile)
        doc.documentElement.normalize()
        
        val permissions = doc.getElementsByTagName("uses-permission")
        for (i in 0 until permissions.length) {
            val node = permissions.item(i)
            if (node.nodeType == org.w3c.dom.Node.ELEMENT_NODE) {
                val element = node as Element
                val name = element.getAttribute("android:name")
                assertNotEquals("INTERNET permission must never be present", "android.permission.INTERNET", name)
            }
        }
    }
}