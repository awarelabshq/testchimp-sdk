package org.testchimp.sdk.be.java.spring;


import javax.servlet.ServletOutputStream;
import javax.servlet.WriteListener;
import java.io.ByteArrayOutputStream;
import java.io.IOException;

public class FilterServletOutputStream extends ServletOutputStream {
    private ServletOutputStream originalStream;
    private ByteArrayOutputStream cachedResponse;

    public FilterServletOutputStream(ServletOutputStream originalStream, ByteArrayOutputStream cachedResponse) {
        this.originalStream = originalStream;
        this.cachedResponse = cachedResponse;
    }

    @Override
    public void write(int b) throws IOException {
        cachedResponse.write(b);
        originalStream.write(b);
    }

    @Override
    public void write(byte[] b) throws IOException {
        cachedResponse.write(b);
        originalStream.write(b);
    }

    @Override
    public void write(byte[] b, int off, int len) throws IOException {
        cachedResponse.write(b, off, len);
        originalStream.write(b, off, len);
    }

    @Override
    public boolean isReady() {
        return true;
    }

    @Override
    public void setWriteListener(WriteListener writeListener) {
        throw new UnsupportedOperationException();
    }
}